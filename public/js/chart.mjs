/** Generic, chronological dot chart. Nulls are gaps, never numeric zero. */
export function renderTimeChart(svg, {series = [], year, color = '#173da5', unit = '', label = '', onYear} = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const create = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  svg.replaceChildren();
  const width = 480, height = 230, left = 69, right = 21, top = 24, bottom = 40;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-label', `${label || 'Vývoj v čase'}${unit ? ` (${unit})` : ''}. Body lze zvolit klávesnicí.`);
  const title = create('title', {}, `${label || 'Vývoj v čase'} · ${unit}`);
  svg.append(title);
  const rows = [...series].filter(p => Number.isFinite(Number(p.year))).sort((a,b) => Number(a.year)-Number(b.year));
  const hasValue = row => typeof row.value === 'number' && Number.isFinite(row.value);
  const values = rows.filter(hasValue).map(p => p.value);
  if (!values.length) {
    svg.append(create('text', {x:width/2,y:height/2,'text-anchor':'middle',fill:'#65738a','font-size':13}, 'Pro toto území nejsou dostupná data.'));
    return;
  }
  const first = Number(rows[0].year), last = Number(rows.at(-1).year);
  const x = y => first === last ? (left+width-right)/2 : left+(Number(y)-first)/(last-first)*(width-left-right);
  let low = Math.min(...values), high = Math.max(...values);
  const padding = high === low ? (high === 0 ? 1 : Math.abs(high)*.04) : (high-low)*.12;
  low -= padding; high += padding;
  // Local extent preserves small changes in large absolute quantities.
  if (Math.min(...values) >= 0 && low < 0) low = 0;
  const y = value => height-bottom-(value-low)/(high-low)*(height-top-bottom);
  const ticks = Array.from({length:4}, (_, i) => low+(high-low)*i/3);
  const magnitude = Math.max(Math.abs(high),Math.abs(low));
  const compact = magnitude >= 100000;
  const compactUnit = compact ? 10 ** (Math.floor(Math.log10(magnitude)/3)*3) : 1;
  const tickStep = (high-low)/3;
  // Match precision to the local axis span, rather than the absolute quantity.
  // In particular, a population series around 11 million needs decimal millions.
  let precision = Math.min(6, Math.max(0, Math.ceil(-Math.log10(tickStep/compactUnit))+1));
  if (!compact && (high-low)/magnitude < .1) precision = Math.max(1,precision);
  let formatter;
  do {
    formatter = new Intl.NumberFormat('cs-CZ', {maximumFractionDigits:precision, notation:compact?'compact':'standard'});
    if (new Set(ticks.map(value=>formatter.format(value))).size === ticks.length || precision === 6) break;
    precision++;
  } while (precision <= 6);
  const number = value => formatter.format(value);
  for (let i=0;i<4;i++) {
    const value = low+(high-low)*i/3, pos=y(value);
    svg.append(create('line',{x1:left,x2:width-right,y1:pos,y2:pos,stroke:'#e8edf4','stroke-width':1}));
    svg.append(create('text',{x:left-10,y:pos+3,'text-anchor':'end',fill:'#748199','font-size':10},number(value)));
  }
  if (Number(year)>=first && Number(year)<=last) svg.append(create('line',{x1:x(year),x2:x(year),y1:top-5,y2:height-bottom+4,stroke:color,'stroke-opacity':.22,'stroke-width':1.5,'stroke-dasharray':'3 4'}));
  const interactive = (group, row, description) => {
    group.setAttribute('data-year', row.year);
    group.setAttribute('aria-label', description);
    group.append(create('title',{},description));
    if (typeof onYear === 'function') {
      group.setAttribute('role','button'); group.setAttribute('tabindex','0');
      group.addEventListener('click',()=>onYear(Number(row.year)));
      group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onYear(Number(row.year));}});
    }
    return group;
  };
  // No connecting lines: sparse years and missing observations remain honest gaps.
  for (const row of rows) {
    const valid = hasValue(row), posX=x(row.year), posY=valid?y(row.value):height-bottom;
    const formatted = valid ? new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:6}).format(row.value) : 'Údaj není k dispozici';
    const description = `${row.year}: ${formatted}${valid && unit ? ` ${unit}`:''}${row.partial ? ', částečné pokrytí' : ''}`;
    const group = interactive(create('g',{class:'chart-point'}),row,description);
    group.append(create('circle',{cx:posX,cy:posY,r:11,fill:'transparent'}));
    if (valid) {
      group.append(create('circle',{cx:posX,cy:posY,r:Number(row.year)===Number(year)?5.5:3.5,fill:row.partial?'white':color,stroke:color,'stroke-width':row.partial?2:1}));
    } else {
      group.append(create('path',{d:`M${posX-3},${posY-3}l6,6m-6,0l6,-6`,stroke:'#94a0b3','stroke-width':1.5,fill:'none'}));
    }
    svg.append(group);
  }
  const tickYears = rows.filter((row,index)=>index===0||index===rows.length-1||Number(row.year)===Number(year)|| (Number(row.year)-first)%Math.max(1,Math.ceil((last-first)/5))===0);
  let previousX=-Infinity;
  for (const row of tickYears) {
    const pos=x(row.year);
    if (pos-previousX<35 && Number(row.year)!==Number(year) && Number(row.year)!==last) continue;
    const group=interactive(create('g',{class:'chart-year-tick'}),row,`Zobrazit rok ${row.year}`);
    group.append(create('rect',{x:pos-16,y:height-bottom+7,width:32,height:25,fill:'transparent'}));
    group.append(create('text',{x:pos,y:height-bottom+25,'text-anchor':'middle',fill:Number(row.year)===Number(year)?color:'#748199','font-size':10,'font-weight':Number(row.year)===Number(year)?700:400},row.year));
    svg.append(group); previousX=pos;
  }
}
