"""Numerical tests, not behavioral evaluation of Codex and not field validation."""
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

PATH = Path(__file__).resolve().parents[1] / 'competition/examples/sensitivity.py'
spec = importlib.util.spec_from_file_location('competition_sensitivity', PATH)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class SensitivityTests(unittest.TestCase):
    def test_real_zero_baseline_keeps_absolute_difference(self):
        self.assertEqual(m.compare(lambda p: 0, lambda p: 2, {}),
                         {'baseline': 0., 'candidate': 2., 'benefit_absolute': -2., 'benefit_percent': None})

    def test_higher_is_better_is_explicit(self):
        self.assertEqual(m.compare(lambda p: 4, lambda p: 6, {}, lower_is_better=False)['benefit_absolute'], 2)

    def test_missing_and_nonfinite_output_are_rejected(self):
        for bad in [None, True, '4', math.nan, math.inf]:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                m.compare(lambda p: bad, lambda p: 1, {})

    def test_both_models_receive_same_values_but_independent_copies(self):
        p = {'a': 3.}
        def first(x):
            x['a'] = 99
            return 5
        self.assertEqual(m.compare(first, lambda x: x['a'], p)['candidate'], 3)
        self.assertEqual(p, {'a': 3.})

    def test_sweep_detects_change_of_sign(self):
        result = m.one_at_a_time(lambda p: 10, lambda p: p['x'], {'x': 8}, {'x': (5, 15)})
        self.assertTrue(result['parameters'][0]['strict_sign_change'])
        self.assertEqual(result['parameters'][0]['benefit_span'], 10)

    def test_only_one_input_changes_and_order_is_deterministic(self):
        base, ranges = {'a': 1., 'b': 2.}, {'b': (0., 3.), 'a': (0., 2.)}
        result = m.one_at_a_time(lambda p: 10, lambda p: p['a'] + p['b'], base, ranges)
        self.assertEqual([row['parameter'] for row in result['parameters']], ['b', 'a'])
        for row in result['parameters']:
            for case in row['cases']:
                self.assertLessEqual(sum(case['inputs'][k] != base[k] for k in base), 1)
        self.assertEqual(result, m.one_at_a_time(lambda p: 10, lambda p: p['a'] + p['b'], base, ranges))

    def test_invalid_bounds_fail_instead_of_being_corrected(self):
        for ranges in [{'x': (3, 2)}, {'x': (1, 1)}, {'x': (2, 3)}, {'z': (0, 2)}, {'x': (0, math.inf)}]:
            with self.subTest(ranges=ranges), self.assertRaises(ValueError):
                m.checked_ranges({'x': 1}, ranges)

    def test_toy_cost_reference_matches_independent_arithmetic(self):
        result = m.compare(m.reference_cost, m.proposal_cost, m.BASE)
        self.assertAlmostEqual(result['benefit_absolute'], 100 / .9 * 1000 - 100 / 3 * 2500 - 10000)
        self.assertLess(m.compare(m.reference_cost, m.proposal_cost, {**m.BASE, 'electricity_czk_mwh': 3500})['benefit_absolute'], 0)

    def test_sobol_budget_checked_before_optional_import(self):
        for n in [0, 17, 32768, True]:
            with self.subTest(n=n), self.assertRaises(ValueError):
                m.sobol_benefit(lambda p: 1, lambda p: 0, {'x': 1}, {'x': (0, 2)}, n=n)

    def test_cli_is_runnable_without_salib_and_labels_its_fixtures(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'result.json'
            run = subprocess.run([sys.executable, str(PATH), '--output', str(out)], capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            data = json.loads(out.read_text())
            self.assertEqual(data['evidence_type'], 'synthetic_fixture_not_field_evidence')
            self.assertEqual(len(data['parameters']), 5)

    def require_salib(self):
        if importlib.util.find_spec('SALib') is None:
            if os.environ.get('ENOL_REQUIRE_SALIB') == '1':
                self.fail('SALib required by this integration run, but not installed')
            self.skipTest('SALib optional dependency absent; integration test NOT RUN')

    def test_optional_sobol_matches_additive_analytic_reference(self):
        self.require_salib()
        result = m.sobol_benefit(lambda p: p['x'] + 2 * p['y'], lambda p: 0,
                                {'x': .5, 'y': .5}, {'x': (0, 1), 'y': (0, 1)}, n=512)
        self.assertEqual(result['status'], 'computed')
        self.assertEqual(result['model_evaluations'], 4096)
        for index, expected in zip(result['indices'], [.2, .8]):
            self.assertAlmostEqual(index['S1'], expected, delta=.04)
            self.assertAlmostEqual(index['ST'], expected, delta=.04)

    def test_optional_sobol_constant_difference_is_not_fake_indices(self):
        self.require_salib()
        result = m.sobol_benefit(lambda p: p['x'], lambda p: p['x'], {'x': 1}, {'x': (0, 2)}, n=16)
        self.assertEqual(result['status'], 'constant_output')
        self.assertIsNone(result['indices'])


if __name__ == '__main__':
    unittest.main()
