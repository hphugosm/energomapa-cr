import {clusterPoints} from './analysis/clustering.mjs';
import {format} from './engine.mjs?v=0.4.0';
/** Generic SVG choropleth; camera, projection and hatch treatment adapted from TT-Decin. */
const NS = 'http://www.w3.org/2000/svg';
const MAX_ZOOM = 40;
let sequence = 0;
const polygons = geometry => geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
const codeOf = feature => String(feature.properties?.code ?? feature.id);
const element = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

export function createEnergyMap(svg, {onSelect = () => {}, onHover = () => {}, onPointSelect = () => {}, onMapPoint = () => {}} = {}) {
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
  const isochrones = element('g', {class:'isochrone-shapes', 'pointer-events':'none'});
  cameraGroup.append(isochrones);
  const pointGroup = element('g', {class:'point-layers'});
  svg.append(defs, cameraGroup, pointGroup);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const oldTouchAction = svg.style.touchAction;
  svg.style.touchAction = 'none';
  const listeners = [], chunks = new Map(), records = new Map();
  let pointLayers = [], analysis = null, pickPoint = false, inverseProjection = coordinate => coordinate, pointFrame = 0;
  let overview = [], countryPath = '', projection = coordinate => coordinate;
  let context = {regionId: null, selectedId: 'CZ'};
  let state = {values: new Map(), coverage: new Map(), names: new Map(), colorFor: () => '#c2d5df', year: '', unitLabel: ''};
  let camera = {z: 1, x: 0, y: 0}, viewport = {width: 1000, height: 600};
  let drag = null, didDrag = false, focusId = null, destroyed = false, animation = 0;
  const listen = (target, type, fn, options) => { target.addEventListener(type, fn, options); listeners.push(() => target.removeEventListener(type, fn, options)); };
  const apply = () => {cameraGroup.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.z})`); schedulePoints();};
  const schedulePoints = () => {
    if ((!pointLayers.length && !analysis?.locations?.length) || pointFrame || destroyed) return;
    pointFrame = requestAnimationFrame(() => {pointFrame = 0; renderPoints();});
  };
  const renderPoints = () => {
    pointGroup.replaceChildren();
    const rect = svg.getBoundingClientRect();
    for (const layer of pointLayers) {
      for (const cluster of clusterPoints(layer.features, {project:projection, camera, width:viewport.width, height:viewport.height, cellSize:32 * viewport.width / (rect.width || 1000)})) {
        const count = cluster.features.length, feature = cluster.features[0];
        const label = count > 1 ? `${layer.name}: ${count} záznamů — přiblížit` : `${layer.name}: ${feature.properties?.name || feature.id}`;
        const node = element('g', {transform:`translate(${cluster.x} ${cluster.y})`, role:'button', tabindex:0, 'aria-label':label, class:'map-point'});
        const radius = (count > 1 ? 10 + Math.min(7, Math.log2(count)) : 5) * viewport.width / (rect.width || 1000);
        node.append(element('circle', {r:radius, fill:layer.color || '#8c3fa6', stroke:'#fff', 'stroke-width':1.5}));
        const title = element('title'); title.textContent = label; node.append(title);
        if (count > 1) {const text = element('text', {'text-anchor':'middle', dy:'.35em', fill:'#fff', 'font-size':10 * viewport.width / (rect.width || 1000), 'pointer-events':'none'}); text.textContent = count; node.append(text);}
        const activate = event => {
          event.stopPropagation?.(); if (didDrag) return;
          if (pickPoint) {const [lon,lat] = feature.geometry.coordinates; onMapPoint(lat,lon); return;}
          if (count > 1 && camera.z < MAX_ZOOM) zoom(2, {x:cluster.x,y:cluster.y}, true);
          else onPointSelect({layerId:layer.id, feature, features:cluster.features});
        };
        node.addEventListener('focusin', () => {node.querySelector('circle').setAttribute('stroke','#e26c13'); node.querySelector('circle').setAttribute('stroke-width','3');});
        node.addEventListener('focusout', () => {node.querySelector('circle').setAttribute('stroke','#fff'); node.querySelector('circle').setAttribute('stroke-width','1.5');});
        node.addEventListener('click', activate);
        node.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); didDrag = false; activate(event);}});
        pointGroup.append(node);
      }
    }
    const size = viewport.width / (rect.width || 1000);
    const locations = (analysis?.locations || []).filter(location => [location.lon,location.lat].every(Number.isFinite)).map((location,index) => ({type:'Feature',geometry:{type:'Point',coordinates:[location.lon,location.lat]},properties:{...location,rank:location.rank || index+1}}));
    const groups = clusterPoints(locations,{project:projection,camera,width:viewport.width,height:viewport.height,cellSize:32*size});
    // Merge neighboring grid cells too: numbered markers must not collide across a cell edge.
    for (let i=0;i<groups.length;i++) for (let j=i+1;j<groups.length;j++) {
      if (Math.hypot(groups[i].x-groups[j].x,groups[i].y-groups[j].y)>=30*size) continue;
      const a=groups[i],b=groups[j],count=a.features.length+b.features.length;
      a.x=(a.x*a.features.length+b.x*b.features.length)/count; a.y=(a.y*a.features.length+b.y*b.features.length)/count;
      a.features.push(...b.features); groups.splice(j,1); i=-1; break;
    }
    for (const group of groups) {
      const clustered = group.features.length>1 && camera.z<MAX_ZOOM;
      const members = clustered ? [group.features[0]] : group.features;
      for (const [memberIndex,feature] of members.entries()) {
        const location=feature.properties, spread=!clustered && members.length>1;
        const angle=2*Math.PI*memberIndex/members.length;
        const x=group.x+(spread ? Math.cos(angle)*28*size : 0), y=group.y+(spread ? Math.sin(angle)*28*size : 0);
        if (spread) pointGroup.append(element('line',{x1:group.x,y1:group.y,x2:x,y2:y,stroke:'#b65a10','stroke-width':size,'pointer-events':'none'}));
        const label=clustered ? `TOP ${group.features.length} lokalit – přiblížit` : `${location.rank}. ${location.name || location.id}${Number.isFinite(location.score) ? ` · skóre ${format(location.score)}` : ''}`;
        const node=element('g',{transform:`translate(${x} ${y})`,role:'button',tabindex:0,'aria-label':label,class:clustered ? 'map-point analysis-cluster' : 'map-point analysis-location'});
        node.append(element('circle',{r:12*size,fill:'#b65a10',stroke:'#fff','stroke-width':2*size}));
        const title=element('title'); title.textContent=label; node.append(title);
        const text=element('text',{'text-anchor':'middle',dy:'.35em',fill:'#fff','font-size':11*size,'font-weight':700,'pointer-events':'none'}); text.textContent=clustered ? group.features.length : location.rank; node.append(text);
        const activate=event=>{
          event.stopPropagation?.(); if (didDrag) return;
          if (clustered) {
            const coordinates=group.features.map(item=>projection(item.geometry.coordinates));
            const next=fittedCamera({minX:Math.min(...coordinates.map(p=>p[0])),maxX:Math.max(...coordinates.map(p=>p[0])),minY:Math.min(...coordinates.map(p=>p[1])),maxY:Math.max(...coordinates.map(p=>p[1]))},.65,camera.z*2);
            if (next) move(next,{animate:true});
          } else if (pickPoint) onMapPoint(location.lat,location.lon); else onSelect(String(location.id));
        };
        node.addEventListener('click',activate);
        node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();didDrag=false;activate(event);}});
        node.addEventListener('focusin',()=>node.querySelector('circle').setAttribute('stroke','#172f4a'));
        node.addEventListener('focusout',()=>node.querySelector('circle').setAttribute('stroke','#fff'));
        pointGroup.append(node);
      }
    }
  };
  const cancelMove = () => {cancelAnimationFrame(animation); animation = 0; svg.setAttribute('data-camera-moving', 'false');};
  const move = (next, {animate = true, duration = 560} = {}) => {
    cancelMove();
    if (!animate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      camera = next; apply(); return;
    }
    const start = {...camera}, time = performance.now();
    svg.setAttribute('data-camera-moving', 'true');
    const from = {x:(viewport.width / 2 - start.x) / start.z, y:(viewport.height / 2 - start.y) / start.z};
    const to = {x:(viewport.width / 2 - next.x) / next.z, y:(viewport.height / 2 - next.y) / next.z};
    const tick = now => {
      if (destroyed) return;
      const t = Math.min(1, (now - time) / duration), ease = t * t * (3 - 2 * t);
      const z = Math.exp(Math.log(start.z) + (Math.log(next.z) - Math.log(start.z)) * ease);
      camera = {z, x:viewport.width / 2 - (from.x + (to.x - from.x) * ease) * z,
        y:viewport.height / 2 - (from.y + (to.y - from.y) * ease) * z};
      apply();
      if (t < 1) animation = requestAnimationFrame(tick);
      else {animation = 0; camera = next; apply(); svg.setAttribute('data-camera-moving', 'false');}
    };
    animation = requestAnimationFrame(tick);
  };
  const shape = feature => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const d = polygons(feature.geometry).flatMap(polygon => polygon.map(ring => ring.map((coordinate, index) => {
      const [x, y] = projection(coordinate);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;
    }).join('') + 'Z')).join('');
    return {d, bounds: {minX, minY, maxX, maxY}};
  };
  const fittedCamera = (bounds, room = .94, minimumZoom = 0.1) => {
    if (!bounds || !Number.isFinite(bounds.minX)) return;
    const {width, height} = viewport;
    const z = Math.min(MAX_ZOOM, Math.max(minimumZoom, Math.min((width - 48) * room / Math.max(1, bounds.maxX - bounds.minX), (height - 48) * room / Math.max(1, bounds.maxY - bounds.minY))));
    return {z, x: width / 2 - (bounds.minX + bounds.maxX) / 2 * z, y: height / 2 - (bounds.minY + bounds.maxY) / 2 * z};
  };
  const fit = (options = {}) => {
    const parent = fittedCamera(records.get(context.regionId || 'CZ')?.bounds);
    const selected = records.get(context.selectedId);
    const next = selected?.level === 'municipality'
      ? fittedCamera(selected.bounds, .64, parent?.z) : parent;
    if (next) move(next, options);
  };
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
      const matching = !analysis?.matches || (record.level === 'region' ? (analysis.regionCounts?.get(code) || 0) > 0 : analysis.matches.has(code));
      node.setAttribute('opacity', matching ? '1' : '.18');
      node.classList.toggle('analysis-top', Boolean(analysis?.topIds?.has(code)));
      if (analysis?.topIds?.has(code)) {node.setAttribute('stroke','#e26c13'); node.setAttribute('stroke-width','2.5');}
      node.setAttribute('aria-pressed', String(code === context.selectedId));
      const name = state.names?.get(code) || record.name;
      const valueStatus = state.coverage?.get(code)?.valueStatus;
      const formatted = valid ? `${format(value, 3)} ${state.unitLabel}` : valueStatus === 'not_applicable' ? 'Nevztahuje se' : valueStatus === 'unavailable' ? 'Údaj není dostupný' : 'Chybějící údaj';
      const status = coverage?.denominatorMissing ? ' · Chybí jmenovatel pro normalizaci' : valid && coverage?.partial ? ` · NEÚPLNÝ SOUČET (${coverage.coverage ?? '?'}/${coverage.expected ?? '?'} obcí)` : '';
      node.setAttribute('aria-label', `${name} (${code}) · ${state.year} · ${formatted}${status}`);
      const score = analysis?.scores?.get(code);
      const analysisNote = Number.isFinite(score) ? ` · Skóre ${format(score)}` : record.level === 'region' && analysis?.regionCounts?.has(code) ? ` · ${analysis.regionCounts.get(code)} obcí odpovídá analýze` : '';
      node.querySelector('title').textContent = `${name} · ${formatted}${status}${analysisNote}`;
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
    cancelMove();
    const rect = svg.getBoundingClientRect();
    const previous = viewport;
    viewport = {width: 1000, height: Math.max(180, Math.min(1800, 1000 * (rect.height || 600) / (rect.width || 1000)))};
    svg.setAttribute('viewBox', `0 0 ${viewport.width} ${viewport.height}`);
    camera.y += (viewport.height - previous.height) / 2;
    apply();
  };
  const targetId = event => event.target.closest?.('path[data-id]')?.getAttribute('data-id');
  listen(cameraGroup, 'click', event => { const code = targetId(event); if (code && !didDrag && !pickPoint) onSelect(code); });
  listen(cameraGroup, 'keydown', event => { const code = targetId(event); if (code && !pickPoint && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(code); } });
  listen(cameraGroup, 'focusin', event => { focusId = event.target.matches?.(':focus-visible') ? targetId(event) : null; refreshOutlines(); });
  listen(cameraGroup, 'focusout', () => { focusId = null; refreshOutlines(); });
  listen(cameraGroup, 'pointerover', event => { const code = targetId(event); if (code) onHover(code); });
  listen(cameraGroup, 'pointerout', event => { if (targetId(event)) onHover(null); });
  const position = event => {
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM(); return matrix ? point.matrixTransform(matrix.inverse()) : point;
  };
  const zoom = (factor, center = {x: viewport.width / 2, y: viewport.height / 2}, animate = false) => {
    if (!(factor > 0) || !Number.isFinite(factor)) return;
    const z = Math.max(.5, Math.min(MAX_ZOOM, camera.z * factor)), ratio = z / camera.z;
    move({z, x: center.x - (center.x - camera.x) * ratio, y: center.y - (center.y - camera.y) * ratio}, {animate, duration:240});
  };
  listen(svg, 'pointerdown', event => {
    if (event.button !== 0) return;
    cancelMove(); focusId = null; refreshOutlines();
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
  listen(svg, 'click', event => {if (!pickPoint || didDrag || event.target.closest?.('.map-point')) return; const point = position(event); const [lon,lat] = inverseProjection([(point.x-camera.x)/camera.z,(point.y-camera.y)/camera.z]); onMapPoint(lat,lon);});
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
        inverseProjection = ([x,y]) => [((x-50)/scale+minX)/cosine,maxY-(y-30)/scale];
        projection = ([x, y]) => [50 + (x * cosine - minX) * scale, 30 + (maxY - y) * scale];
      }
      render(); fit({animate:false});
    },
    setMunicipalities(regionId, geojson) {
      const changed = chunks.get(String(regionId)) !== geojson;
      chunks.set(String(regionId), geojson);
      if (String(regionId) === context.regionId && changed) render();
    },
    setContext(next, {fit: shouldFit = true, animate = true} = {}) {
      const regionId = next.regionId == null ? null : String(next.regionId);
      const changedRegion = regionId !== context.regionId;
      context = {regionId, selectedId: String(next.selectedId ?? next.regionId ?? 'CZ')};
      if (changedRegion) render(); else paint();
      if (shouldFit) fit({animate});
    },
    setPointLayers(layers = []) {
      pointLayers = layers.map(layer => ({...layer, features:layer.features || layer.data?.features || (Array.isArray(layer.points) ? layer.points.map(point => ({type:'Feature',id:point.id,properties:{...point.properties,name:point.name},geometry:{type:'Point',coordinates:[point.lon,point.lat]}})) : layer.points?.features) || []}));
      renderPoints();
    },
    setAnalysis(next) {analysis = next; paint(); renderPoints();},
    setPickPoint(enabled) {pickPoint = Boolean(enabled); svg.style.cursor = pickPoint ? 'crosshair' : '';},
    fitGeoJSON(geojson, {animate = true} = {}) {
      const features = geojson?.type === 'Feature' ? [geojson] : geojson?.features || [];
      const bounds = {minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
      for (const feature of features) if (polygons(feature.geometry).length) {
        const box = shape(feature).bounds;
        bounds.minX = Math.min(bounds.minX,box.minX); bounds.minY = Math.min(bounds.minY,box.minY);
        bounds.maxX = Math.max(bounds.maxX,box.maxX); bounds.maxY = Math.max(bounds.maxY,box.maxY);
      }
      const next = fittedCamera(bounds);
      if (next) move(next,{animate});
    },
    setIsochrones(geojson) {
      isochrones.replaceChildren();
      for (const feature of geojson?.features || []) if (polygons(feature.geometry).length) {
        const node = element('path', {d:shape(feature).d,fill:'#267bc8','fill-opacity':'.12',stroke:'#267bc8','stroke-width':2,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd'});
        const title = element('title'); title.textContent = feature.properties?.label || 'Dojezdová oblast'; node.append(title); isochrones.append(node);
      }
    },
    update(next) { state = {...state, ...next}; paint(); },
    zoomBy(factor) { zoom(factor, undefined, true); },
    reset() { fit(); },
    destroy() { destroyed = true; cancelMove(); cancelAnimationFrame(pointFrame); observer?.disconnect(); listeners.forEach(remove => remove()); defs.remove(); cameraGroup.remove(); pointGroup.remove(); svg.style.touchAction = oldTouchAction; }
  };
}
