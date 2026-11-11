/** Small transparent calculators. All energy/cost inputs are explicit assumptions. */
const number = (v, name, min = 0) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) throw new TypeError(`${name}: neplatná hodnota`);
  return v;
};
const positive = (v, name) => { number(v, name); if (v === 0) throw new RangeError(`${name}: musí být > 0`); return v; };
export function annualPV({capacityKwp, specificYield}) {
  return number(capacityKwp, 'kWp') * number(specificYield, 'kWh/kWp/rok');
}
export function heatPump({heatKwh, scop, referenceEfficiency}) {
  number(heatKwh, 'kWh tepla'); positive(scop, 'SCOP'); positive(referenceEfficiency, 'účinnost');
  if (referenceEfficiency > 1) throw new RangeError('Účinnost reference musí být 0–1 (stejná energetická báze).');
  return {electricityKwh: heatKwh / scop, referenceFuelKwh: heatKwh / referenceEfficiency};
}
export function npv(cashflows, discountRate) {
  if (!Array.isArray(cashflows) || !cashflows.length) throw new TypeError('Chybí cashflow včetně roku 0.');
  number(discountRate, 'diskont', 0);
  return cashflows.reduce((sum, cf, t) => sum + number(cf, `cashflow ${t}`, -Infinity) / (1 + discountRate) ** t, 0);
}
export function economics({capex, annualBenefit, annualOpex, years, discountRate}) {
  number(capex, 'investice'); number(annualBenefit, 'roční přínos'); number(annualOpex, 'roční náklady');
  number(years, 'roky', 1); if (!Number.isInteger(years) || years > 100) throw new RangeError('Horizont musí být 1–100 celých let.');
  number(discountRate, 'diskont');
  const netAnnual = annualBenefit - annualOpex;
  const cashflows = [-capex, ...Array(years).fill(netAnnual)];
  const presentValue = npv(cashflows, discountRate);
  const simplePaybackYears = netAnnual > 0 ? capex / netAnnual : capex === 0 && netAnnual === 0 ? 0 : null;
  return {netAnnual, npv: presentValue, simplePaybackYears, cashflows,
    returnedWithinHorizon: simplePaybackYears !== null && simplePaybackYears <= years};
}
export function batteryStep({socKwh, capacityKwh, maxPowerKw, chargeKw, dischargeKw, dtHours, chargeEfficiency, dischargeEfficiency}) {
  for (const [k,v] of Object.entries({socKwh, capacityKwh, maxPowerKw, chargeKw, dischargeKw})) number(v,k);
  for (const [k,v] of Object.entries({dtHours, chargeEfficiency, dischargeEfficiency})) positive(v,k);
  if (socKwh > capacityKwh || chargeEfficiency > 1 || dischargeEfficiency > 1 || (chargeKw > 0 && dischargeKw > 0)) throw new RangeError('Neplatný stav / účinnost / souběh nabíjení a vybíjení.');
  const actualChargeKw = Math.min(chargeKw, maxPowerKw, (capacityKwh - socKwh) / (dtHours * chargeEfficiency));
  const actualDischargeKw = Math.min(dischargeKw, maxPowerKw, socKwh * dischargeEfficiency / dtHours);
  return {socKwh: Math.min(capacityKwh, Math.max(0, socKwh + actualChargeKw * dtHours * chargeEfficiency - actualDischargeKw * dtHours / dischargeEfficiency)), actualChargeKw, actualDischargeKw};
}
export function validateDeck(deck) {
  if (!deck || !Array.isArray(deck.slides) || !deck.slides.length || typeof deck.title !== 'string') throw Error('Neplatná prezentace.');
  const ids = new Set(), types = new Set(['title','chart','map','steps','economics','conclusion']);
  for (const slide of deck.slides) {
    if (!slide.id || ids.has(slide.id) || !types.has(slide.type) || !slide.title) throw Error('Neplatné/duplicitní ID, typ nebo titulek snímku.');
    ids.add(slide.id); number(slide.seconds, 'čas snímku', 1);
    if (slide.type === 'chart' && (!slide.metric || !slide.territory)) throw Error('Graf potřebuje metric a territory.');
    if (slide.type === 'map' && !slide.frame) throw Error('Mapa potřebuje frame.');
  }
  return deck;
}
export function safeLocalURL(value, base) {
  const b = new URL(base), u = new URL(value, b);
  if (!['http:','https:'].includes(u.protocol) || u.origin !== b.origin) throw Error('Vložený obsah musí být na stejném webu.');
  return u.href;
}
