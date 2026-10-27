/** Generic SVG choropleth; camera, projection and hatch treatment adapted from TT-Decin. */
const NS = 'http://www.w3.org/2000/svg';
let sequence = 0;
const polygons = geometry => geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
const codeOf = feature => String(feature.properties?.code ?? feature.id);
const element = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

export function createEnergyMap(svg, {onSelect = () => {}, onHover = () => {}} = {}) {
  const id = `energy-missing-${++sequence}`;
  const defs = element('defs');
  const pattern = element('pattern', {id, width: 6, height: 6, patternUnits: 'userSpaceOnUse'});
  pattern.append(element('rect', {width: 6, height: 6, fill: '#e3e7ed'}), element('path', {d: 'M-1,1L1,-1M0,6L6,0M5,7L7,5', stroke: '#a1aab7', 'stroke-width': 1}));
  defs.append(pattern);
  const cameraGroup = element('g', {class: 'energy-map-camera'});
  const regions = element('g', {class: 'region-shapes'});
  const municipalities = element('g', {class: 'municipality-shapes'});
  const outlines = element('g', {'pointer-events': 'none', 'aria-hidden': 'true'});
  const regionOutline = element('path', {fill: 'none', stroke: '#526174', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke'});
  const selectedOutline = element('path', {fill: 'none', stroke: '#172f4a', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round'});
  const focusOutline = element('path', {fill: 'none', stroke: '#e26c13', 'stroke-width': 4, 'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': '5 3'});
  outlines.append(regionOutline, selectedOutline, focusOutline);
  cameraGroup.append(regions, municipalities, outlines);
  svg.append(defs, cameraGroup);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const oldTouchAction = svg.style.touchAction;
  svg.style.touchAction = 'none';
  const listeners = [], chunks = new Map(), records = new Map();
  let overview = [], countryPath = '', projection = coordinate => coordinate;
  let context = {regionId: null, selectedId: 'CZ'};
  let state = {values: new Map(), coverage: new Map(), names: new Map(), colorFor: () => '#c2d5df', year: '', unitLabel: ''};
  let camera = {z: 1, x: 0, y: 0}, viewport = {width: 1000, height: 600};
  let drag = null, didDrag = false, focusId = null, destroyed = false;
  const listen = (target, type, fn, options) => { target.addEventListener(type, fn, options); listeners.push(() => target.removeEventListener(type, fn, options)); };
  const apply = () => cameraGroup.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.z})`);
  const shape = feature => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const d = polygons(feature.geometry).flatMap(polygon => polygon.map(ring => ring.map((coordinate, index) => {
      const [x, y] = projection(coordinate);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;
    }).join('') + 'Z')).join('');
    return {d, bounds: {minX, minY, maxX, maxY}};
  };
  const fitBounds = bounds => {
    if (!bounds || !Number.isFinite(bounds.minX)) return;
    const {width, height} = viewport;
    const z = Math.min(20, Math.max(0.1, Math.min((width - 48) / Math.max(1, bounds.maxX - bounds.minX), (height - 48) / Math.max(1, bounds.maxY - bounds.minY))));
    camera = {z, x: width / 2 - (bounds.minX + bounds.maxX) / 2 * z, y: height / 2 - (bounds.minY + bounds.maxY) / 2 * z};
    apply();
  };
  const fit = () => fitBounds(records.get(context.regionId || 'CZ')?.bounds);
  const refreshOutlines = () => {
    regionOutline.setAttribute('d', context.regionId ? records.get(context.regionId)?.d || '' : countryPath);
    selectedOutline.setAttribute('d', records.get(context.selectedId)?.d || '');
    focusOutline.setAttribute('d', records.get(focusId)?.d || '');
  };
  const paint = () => {
    for (const [code, record] of records) {
      if (!record.node) continue;
      const {node} = record, value = state.values?.get(code), valid = Number.isFinite(value) && typeof value === 'number';
      const neighbor = Boolean(context.regionId && record.level === 'region' && code !== context.regionId);
      node.setAttribute('fill', neighbor ? '#e7ebef' : valid ? state.colorFor(value) : `url(#${id})`);
      node.setAttribute('stroke', record.level === 'region' ? '#aab7c4' : '#b7c2d1');
      node.setAttribute('stroke-width', record.level === 'region' ? '.9' : '.45');
      const coverage = state.coverage?.get(code);
      node.classList.toggle('missing', !valid);
      node.classList.toggle('partial', Boolean(coverage?.partial));
      node.classList.toggle('selected', code === context.selectedId);
      node.classList.toggle('context-region', neighbor);
      node.setAttribute('aria-pressed', String(code === context.selectedId));
      const name = state.names?.get(code) || record.name;
      const formatted = valid ? `${new Intl.NumberFormat('cs-CZ', {maximumFractionDigits: 3}).format(value)} ${state.unitLabel}` : 'Data nejsou dostupná';
      const status = coverage?.denominatorMissing ? ' · Chybí jmenovatel pro normalizaci' : valid && coverage?.partial ? ` · NEÚPLNÝ SOUČET (${coverage.coverage ?? '?'}/${coverage.expected ?? '?'} obcí)` : '';
      node.setAttribute('aria-label', `${name} (${code}) · ${state.year} · ${formatted}${status}`);
      node.querySelector('title').textContent = `${name} · ${formatted}${status}`;
    }
    refreshOutlines();
  };
  const add = (feature, level, layer) => {
    const code = codeOf(feature), geometry = shape(feature);
    const name = feature.properties?.name || code;
    const node = element('path', {d: geometry.d, 'data-id': code, 'data-code': code, class: level === 'region' ? 'region map-territory' : 'municipality map-territory', role: 'button', tabindex: 0, 'fill-rule': 'evenodd', 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round'});
    node.append(element('title'));
    records.set(code, {...geometry, name, node, level});
    layer.append(node);
  };
  const render = () => {
    records.clear(); regions.replaceChildren(); municipalities.replaceChildren();
    const country = overview.find(feature => codeOf(feature) === 'CZ');
    if (country) { const geometry = shape(country); countryPath = geometry.d; records.set('CZ', geometry); }
    for (const feature of overview) if (codeOf(feature) !== 'CZ') add(feature, 'region', regions);
    if (context.regionId) {
      const features = chunks.get(context.regionId)?.features || [];
      for (const feature of features) add(feature, 'municipality', municipalities);
      // Municipal polygons receive pointer events while their parent remains an outline.
      const active = records.get(context.regionId)?.node;
      if (active && features.length) { active.setAttribute('fill-opacity', '.18'); active.setAttribute('tabindex', '-1'); active.setAttribute('pointer-events', 'none'); }
    }
    paint();
  };
  const resize = () => {
    const rect = svg.getBoundingClientRect();
    const previous = viewport;
    viewport = {width: 1000, height: Math.max(180, Math.min(1800, 1000 * (rect.height || 600) / (rect.width || 1000)))};
    svg.setAttribute('viewBox', `0 0 ${viewport.width} ${viewport.height}`);
    camera.y += (viewport.height - previous.height) / 2;
    apply();
  };
  const targetId = event => event.target.closest?.('path[data-id]')?.getAttribute('data-id');
  listen(cameraGroup, 'click', event => { const code = targetId(event); if (code && !didDrag) onSelect(code); });
  listen(cameraGroup, 'keydown', event => { const code = targetId(event); if (code && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(code); } });
  listen(cameraGroup, 'focusin', event => { focusId = targetId(event); refreshOutlines(); });
  listen(cameraGroup, 'focusout', () => { focusId = null; refreshOutlines(); });
  listen(cameraGroup, 'pointerover', event => { const code = targetId(event); if (code) onHover(code); });
  listen(cameraGroup, 'pointerout', event => { if (targetId(event)) onHover(null); });
  const position = event => {
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM(); return matrix ? point.matrixTransform(matrix.inverse()) : point;
  };
  const zoom = (factor, center = {x: viewport.width / 2, y: viewport.height / 2}) => {
    if (!(factor > 0) || !Number.isFinite(factor)) return;
    const z = Math.max(.5, Math.min(20, camera.z * factor)), ratio = z / camera.z;
    camera = {z, x: center.x - (center.x - camera.x) * ratio, y: center.y - (center.y - camera.y) * ratio}; apply();
  };
  listen(svg, 'pointerdown', event => {
    if (event.button !== 0) return;
    const point = position(event); didDrag = false;
    drag = {id: event.pointerId, point, camera: {...camera}};
  });
  listen(svg, 'pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const point = position(event), dx = point.x - drag.point.x, dy = point.y - drag.point.y;
    if (Math.hypot(dx, dy) > 4) { didDrag = true; svg.setPointerCapture?.(event.pointerId); }
    if (didDrag) { camera = {...camera, x: drag.camera.x + dx, y: drag.camera.y + dy}; apply(); }
  });
  const endDrag = () => { drag = null; };
  listen(window, 'pointerup', endDrag); listen(window, 'pointercancel', endDrag);
  listen(svg, 'wheel', event => { event.preventDefault(); zoom(Math.exp(-Math.max(-150, Math.min(150, event.deltaY)) * .002), position(event)); }, {passive: false});
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!destroyed) resize(); }) : null;
  observer?.observe(svg); resize();
  return {
    setOverview(geojson) {
      overview = (geojson.features || []).filter(feature => polygons(feature.geometry).length);
      const points = overview.flatMap(feature => polygons(feature.geometry).flatMap(polygon => polygon.flat()));
      if (points.length) {
        const cosine = Math.cos(50.5 * Math.PI / 180);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of points) { minX = Math.min(minX, x * cosine); maxX = Math.max(maxX, x * cosine); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        const scale = 900 / (maxX - minX || 1);
        projection = ([x, y]) => [50 + (x * cosine - minX) * scale, 30 + (maxY - y) * scale];
      }
      render(); fit();
    },
    setMunicipalities(regionId, geojson) { chunks.set(String(regionId), geojson); if (String(regionId) === context.regionId) render(); },
    setContext(next, {fit: shouldFit = true} = {}) {
      const regionId = next.regionId == null ? null : String(next.regionId);
      const changedRegion = regionId !== context.regionId;
      context = {regionId, selectedId: String(next.selectedId ?? next.regionId ?? 'CZ')};
      if (changedRegion) render(); else paint();
      if (shouldFit) fit();
    },
    update(next) { state = {...state, ...next}; paint(); },
    zoomBy(factor) { zoom(factor); },
    reset() { fit(); },
    destroy() { destroyed = true; observer?.disconnect(); listeners.forEach(remove => remove()); defs.remove(); cameraGroup.remove(); svg.style.touchAction = oldTouchAction; }
  };
}
