/** Linear screen-grid clustering; coordinates and cell size share SVG viewport units. */
export function clusterPoints(points, {project, camera, width, height, cellSize = 32}) {
  const cells = new Map();
  for (const feature of points) {
    const [px, py] = project(feature.geometry.coordinates);
    const x = px * camera.z + camera.x, y = py * camera.z + camera.y;
    if (x < -cellSize || y < -cellSize || x > width + cellSize || y > height + cellSize) continue;
    const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
    let cell = cells.get(key);
    if (!cell) {cell = {x: 0, y: 0, features: []}; cells.set(key, cell);}
    cell.x += x; cell.y += y; cell.features.push(feature);
  }
  return [...cells.values()].map(cell => ({...cell, x: cell.x / cell.features.length, y: cell.y / cell.features.length}));
}
