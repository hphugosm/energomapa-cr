"""Paired sensitivity checks. Built-in heating numbers are synthetic fixtures only."""
from __future__ import annotations

import argparse
from importlib import metadata
import json
import math
from pathlib import Path
from typing import Callable, Mapping

Inputs = Mapping[str, float]
Model = Callable[[Inputs], float]


def finite(value: float, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{label}: expected a finite number, not missing data")
    return float(value)


def checked_ranges(base: Inputs, ranges: Mapping[str, tuple[float, float]]) -> dict:
    if not base or not ranges or not set(ranges).issubset(base):
        raise ValueError("Provide base inputs and ranges of existing parameters")
    clean = {k: finite(v, k) for k, v in base.items()}
    for key, bounds in ranges.items():
        if len(bounds) != 2:
            raise ValueError(f"{key}: expected lower and upper bound")
        low, high = (finite(v, key) for v in bounds)
        if not low < high or not low <= clean[key] <= high:
            raise ValueError(f"{key}: require lower < upper with base inside bounds")
    return clean


def compare(baseline: Model, candidate: Model, inputs: Inputs, *, lower_is_better: bool = True) -> dict:
    """Both functions get separate copies of the same scenario; errors are not dropped."""
    if not isinstance(lower_is_better, bool):
        raise ValueError("lower_is_better must be boolean")
    clean = {k: finite(v, k) for k, v in inputs.items()}
    reference = finite(baseline(dict(clean)), "baseline output")
    proposed = finite(candidate(dict(clean)), "candidate output")
    benefit = reference - proposed if lower_is_better else proposed - reference
    return {"baseline": reference, "candidate": proposed, "benefit_absolute": benefit,
            "benefit_percent": 100 * benefit / abs(reference) if reference != 0 else None}


def one_at_a_time(baseline: Model, candidate: Model, base: Inputs,
                  ranges: Mapping[str, tuple[float, float]], *, lower_is_better: bool = True) -> dict:
    """Local screening only. Does not establish global robustness or capture interactions."""
    clean = checked_ranges(base, ranges)
    rows = []
    for key in sorted(ranges):
        low, high = ranges[key]
        cases = [{"position": name, "inputs": {**clean, key: value},
                  **compare(baseline, candidate, {**clean, key: value}, lower_is_better=lower_is_better)}
                 for name, value in [("low", low), ("base", clean[key]), ("high", high)]]
        benefits = [case["benefit_absolute"] for case in cases]
        rows.append({"parameter": key, "cases": cases, "benefit_span": max(benefits) - min(benefits),
                     "strict_sign_change": min(benefits) < 0 < max(benefits)})
    rows.sort(key=lambda row: (-row["benefit_span"], row["parameter"]))
    return {"method": "one-at-a-time", "status": "computed",
            "limitations": "Local three-point screen; misses interactions and untested interior behavior.",
            "base": compare(baseline, candidate, clean, lower_is_better=lower_is_better), "parameters": rows}


def sobol_benefit(baseline: Model, candidate: Model, base: Inputs,
                  ranges: Mapping[str, tuple[float, float]], *, n: int = 512, seed: int = 42,
                  lower_is_better: bool = True) -> dict:
    """SALib indices of paired benefit under explicit independent uniform assumptions."""
    clean = checked_ranges(base, ranges)
    if isinstance(n, bool) or not isinstance(n, int) or n < 16 or n > 16384 or n & (n - 1):
        raise ValueError("n must be a power of two between 16 and 16384")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("seed must be a nonnegative integer")
    try:
        import numpy as np
        from SALib.sample import sobol as sampling
        from SALib.analyze import sobol as analysis
    except ImportError as exc:
        raise RuntimeError("Optional SALib environment missing; install requirements-sensitivity.txt explicitly") from exc
    names = sorted(ranges)
    problem = {"num_vars": len(names), "names": names, "bounds": [list(ranges[k]) for k in names]}
    x = sampling.sample(problem, n, calc_second_order=False, seed=seed)
    y = np.array([compare(baseline, candidate, {**clean, **dict(zip(names, map(float, row)))},
                          lower_is_better=lower_is_better)["benefit_absolute"] for row in x])
    common = {"method": "sobol-paired-benefit", "sample_base_n": n, "model_evaluations": int(len(y)) * 2,
              "seed": seed, "parameter_order": names, "bounds": problem["bounds"],
              "SALib_version": metadata.version("SALib"), "numpy_version": np.__version__,
              "assumptions": "Independent uniform inputs inside the stated bounds; not empirical probabilities.",
              "limitations": "Indices explain model variation, not validity, actual savings or implementation feasibility."}
    if not np.isfinite(y).all():
        raise ValueError("Nonfinite benefit; invalid cases must not be silently removed")
    if float(np.var(y)) == 0:
        return {**common, "status": "constant_output", "indices": None}
    result = analysis.analyze(problem, y, calc_second_order=False, print_to_console=False, seed=seed)
    keys = ("S1", "S1_conf", "ST", "ST_conf")
    if any(not np.isfinite(result[key]).all() for key in keys):
        raise ValueError("Nonfinite sensitivity indices; inspect model and sampling")
    # Do not clamp finite-sample negative or >1 estimates: preserve the evidence.
    return {**common, "status": "computed", "indices": [
        {"parameter": key, **{metric: float(result[metric][i]) for metric in keys}}
        for i, key in enumerate(names)]}


BASE = {"heat_mwh": 100., "fuel_czk_mwh": 1000., "electricity_czk_mwh": 2500.,
        "scop": 3., "additional_annual_cost_czk": 10000.}
RANGES = {"heat_mwh": (80., 120.), "fuel_czk_mwh": (800., 1200.),
          "electricity_czk_mwh": (1800., 3500.), "scop": (2., 4.),
          "additional_annual_cost_czk": (5000., 20000.)}


def reference_cost(p: Inputs) -> float:
    return p["heat_mwh"] / 0.9 * p["fuel_czk_mwh"]


def proposal_cost(p: Inputs) -> float:
    if p["scop"] <= 0:
        raise ValueError("SCOP must be positive")
    return p["heat_mwh"] / p["scop"] * p["electricity_czk_mwh"] + p["additional_annual_cost_czk"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--method", choices=("oat", "sobol"), default="oat")
    parser.add_argument("--n", type=int, default=512)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = (one_at_a_time(reference_cost, proposal_cost, BASE, RANGES) if args.method == "oat"
                  else sobol_benefit(reference_cost, proposal_cost, BASE, RANGES, n=args.n, seed=args.seed))
        result.update({"evidence_type": "synthetic_fixture_not_field_evidence", "unit": "CZK/year",
                       "input_provenance": "All prices, loads and ranges are invented test fixtures, not Czech market estimates.",
                       "scenario": BASE, "ranges": RANGES})
        text = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(text, encoding="utf-8")
        else:
            print(text, end="")
    except (ValueError, RuntimeError) as exc:
        parser.exit(2, f"{exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
