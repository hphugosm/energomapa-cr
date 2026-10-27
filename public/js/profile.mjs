/** A manifest-defined overview of latest verified observations, loaded on demand. */
export class EnergyProfile {
  constructor(engine) {
    this.engine = engine;
    this.metrics = engine.manifest.metrics.filter(metric => metric.profile === true && metric.status === 'verified');
    this.requested = false;
    this.pending = null;
    this.errors = new Map();
  }

  load() {
    this.requested = true;
    if (this.pending) return this.pending;
    this.pending = Promise.all(this.metrics.map(async metric => {
      this.errors.delete(metric.id);
      try { await this.engine.load(metric.id); }
      catch (error) { this.errors.set(metric.id, error.message); }
    })).finally(() => { this.pending = null; });
    return this.pending;
  }

  rows(territoryId) {
    return this.metrics.map(metric => {
      const year = Math.max(...metric.years);
      const loaded = this.engine.cache.has(metric.id);
      return {
        id: metric.id, name: metric.profileLabel || metric.name, unit: metric.unit,
        year, timeType: metric.timeType || (metric.years.length > 1 ? 'timeseries' : 'snapshot'),
        limitation: metric.limitation || metric.source?.limitation || metric.limitations || null, asOf: metric.source?.asOf || null, source: metric.source || {},
        status: loaded ? 'ready' : this.errors.has(metric.id) ? 'error' : this.requested ? 'loading' : 'idle',
        error: this.errors.get(metric.id),
        result: loaded ? this.engine.value(metric.id, territoryId, year, 'absolute') : null
      };
    });
  }
}
