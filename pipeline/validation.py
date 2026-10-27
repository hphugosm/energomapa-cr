"""Strict offline metric contracts and reproducible coverage/aggregation reports.

Missing values never imply zero. ``sum`` in an intensity report is merely a
numeric diagnostic; country_value and regions always follow the declared rule.
"""
import math
from urllib.parse import urlparse

STATES = {'missing', 'not_applicable', 'unavailable'}


def _number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_metrics(metrics, datasets, territories, baseline=None):
    """Validate metadata/data, returning reports keyed by unique metric ID.

    datasets is metric ID → schemaVersion=1 metric payload. baseline is metric
    ID → year → minimum municipality count from an externally reviewed build.
    """
    rows = territories if isinstance(territories, list) else territories['territories']
    by_id = {str(row['id']): row for row in rows}
    if len(by_id) != len(rows):
        raise ValueError('Duplicate territory code')
    municipalities = {code: row for code, row in by_id.items() if row['level'] == 'municipality'}
    regions = {code: row for code, row in by_id.items() if row['level'] == 'region'}
    reports = {}
    for metric in metrics:
        mid = metric.get('id')
        if not isinstance(mid, str) or not mid or mid in reports:
            raise ValueError(f'Invalid or duplicate metric ID: {mid}')
        years = metric.get('years')
        if not isinstance(years, list) or any(isinstance(y, bool) or not isinstance(y, int) for y in years) or len(set(years)) != len(years):
            raise ValueError(f'Invalid metric years: {mid}')
        rule = metric.get('aggregation', 'sum')
        if rule not in {'sum', 'area_weighted_mean'}:
            raise ValueError(f'Unsupported aggregation: {mid}')
        if metric.get('expectedUnit') is not None and metric.get('unit') != metric['expectedUnit']:
            raise ValueError(f'Unexpected unit: {mid}')
        active = metric.get('status') != 'unavailable'
        if metric.get('status') == 'demo':
            raise ValueError(f'Demo metric cannot be active: {mid}')
        if active:
            source = metric.get('source') or {}
            source_url = source.get('url')
            if not isinstance(source_url, str):
                raise ValueError(f'Unit/source URL missing: {mid}')
            url = urlparse(source_url)
            if not isinstance(metric.get('unit'), str) or not metric['unit'].strip() or url.scheme not in {'http', 'https'} or not url.netloc:
                raise ValueError(f'Unit/source URL missing: {mid}')
            if metric.get('timeType') not in {'timeseries', 'snapshot', 'static'}:
                raise ValueError(f'Invalid timeType: {mid}')
            if not years:
                raise ValueError(f'Active metric has no year: {mid}')
        report = {'metric': mid, 'years': sorted(years), 'source_date': metric.get('sourceDate') or (metric.get('source') or {}).get('asOf') or (metric.get('source') or {}).get('updatedAt') or (metric.get('source') or {}).get('retrievedAt'), 'aggregation': rule, 'per_year': {}}
        reports[mid] = report
        if not active:
            continue
        data = datasets.get(mid)
        if not isinstance(data, dict) or data.get('schemaVersion') != 1 or data.get('metricId') != mid or not isinstance(data.get('values'), dict):
            raise ValueError(f'Invalid dataset contract: {mid}')
        statuses = data.get('statuses', {})
        if not isinstance(statuses, dict):
            raise ValueError(f'Invalid statuses: {mid}')
        for series, is_status in [(data['values'], False), (statuses, True)]:
            for year, values in series.items():
                if str(year) not in {str(y) for y in years} or not isinstance(values, dict):
                    raise ValueError(f'Unknown year or invalid observations: {mid}/{year}')
                for code, value in values.items():
                    if code not in by_id:
                        raise ValueError(f'Unknown territory: {mid}/{code}')
                    if is_status:
                        if not isinstance(value, str) or value not in STATES or _number(data['values'].get(str(year), {}).get(code)):
                            raise ValueError(f'Invalid or conflicting status: {mid}/{code}/{year}')
                    elif value is not None and (not _number(value) or (metric.get('nonNegative', True) and value < 0)):
                        raise ValueError(f'Invalid numeric value: {mid}/{code}/{year}')
                    elif value is not None:
                        bounds = metric.get('expectedRange') or {}
                        if isinstance(bounds, (list, tuple)):
                            bounds = dict(zip(['min', 'max'], bounds))
                        if ('min' in bounds and value < bounds['min']) or ('max' in bounds and value > bounds['max']):
                            raise ValueError(f'Value outside expected range: {mid}/{code}/{year}')
        for year in sorted(years):
            values = data['values'].get(str(year), {})
            year_status = statuses.get(str(year), {})
            measured = {code: values[code] for code in municipalities if _number(values.get(code))}
            if len(measured) < (baseline or {}).get(mid, {}).get(str(year), (baseline or {}).get(mid, {}).get(year, 0)):
                raise ValueError(f'Unexpected coverage drop: {mid}/{year}')
            def aggregate(codes):
                valid = [code for code in codes if code in measured]
                if rule == 'area_weighted_mean':
                    valid = [code for code in valid if _number(municipalities[code].get('areaKm2')) and municipalities[code]['areaKm2'] > 0]
                    denominator = sum(municipalities[code]['areaKm2'] for code in valid)
                    return sum(measured[code] * municipalities[code]['areaKm2'] for code in valid) / denominator if denominator else None
                return sum(measured[code] for code in valid) if valid else None
            regional = {code: aggregate([m for m, row in municipalities.items() if row.get('parentId') == code]) for code in regions}
            # Native parent observations remain usable, without inventing municipal coverage.
            for code in regional:
                if _number(values.get(code)):
                    regional[code] = values[code]
            country = aggregate(municipalities)
            country_codes = [code for code, row in by_id.items() if row['level'] == 'country']
            if country_codes and _number(values.get(country_codes[0])):
                country = values[country_codes[0]]
            observations = list(measured.values())
            states = [year_status.get(code, 'missing') for code in municipalities if code not in measured]
            item = {'municipalities_with_data': len(measured), 'municipality_coverage_pct': round(100 * len(measured) / len(municipalities), 4) if municipalities else 0,
                    'regions_with_data': sum(value is not None for value in regional.values()),
                    'min': min(observations) if observations else None, 'max': max(observations) if observations else None,
                    'sum': sum(observations) if observations else None, 'country_value': country, 'regions': regional,
                    **{state: states.count(state) for state in sorted(STATES)}}
            report['per_year'][str(year)] = item
        if years:
            report.update(report['per_year'][str(max(years))])
    return reports


def validate_points(layers, territories):
    """Validate flat point layers without inventing coordinates or output files."""
    rows = territories if isinstance(territories, list) else territories['territories']
    by_id = {str(row['id']): row for row in rows}
    layer_ids = set()
    for layer in layers:
        lid = layer.get('layerId', layer.get('id'))
        kind = layer.get('type', layer.get('kind'))
        source = layer.get('source') or {}
        if not isinstance(lid, str) or not lid or lid in layer_ids or not isinstance(kind, str) or not kind:
            raise ValueError('Invalid or duplicate point layer ID/type')
        layer_ids.add(lid)
        source_url = source.get('url')
        if not isinstance(source.get('name'), str) or not source['name'].strip() or not isinstance(source_url, str):
            raise ValueError(f'Invalid point layer source: {lid}')
        url = urlparse(source_url)
        if url.scheme not in {'http', 'https'} or not url.netloc or not isinstance(layer.get('points'), list):
            raise ValueError(f'Invalid point layer source/points: {lid}')
        ids = set()
        for point in layer['points']:
            pid = point.get('id')
            if not isinstance(pid, str) or not pid or pid in ids:
                raise ValueError(f'Invalid or duplicate point ID: {lid}/{pid}')
            ids.add(pid)
            if point.get('type') != kind or not isinstance(point.get('name'), str) or not point['name'].strip() or not isinstance(point.get('properties'), dict):
                raise ValueError(f'Invalid point properties: {pid}')
            lat, lon = point.get('lat'), point.get('lon')
            if not _number(lat) or not _number(lon) or abs(lat) > 90 or abs(lon) > 180:
                raise ValueError(f'Invalid point coordinates: {pid}')
            municipality = by_id.get(point.get('municipalityCode'), {})
            region = by_id.get(point.get('regionCode'), {})
            if municipality.get('level') != 'municipality' or region.get('level') != 'region' or municipality.get('parentId') != point.get('regionCode'):
                raise ValueError(f'Invalid point municipality/region: {pid}')
    return None
