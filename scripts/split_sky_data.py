import json
from pathlib import Path

root = Path('/home/ubuntu/stargazer-observatory')
source_path = root / 'client/src/data/skyData.ts'
text = source_path.read_text(encoding='utf-8')
start = text.index('export const SKY_DATA = ') + len('export const SKY_DATA = ')
json_start = text.index('{', start)
json_end = text.index(' as const;', json_start)
data = json.loads(text[json_start:json_end])

featured_ids = ['ori', 'uma', 'cas', 'cyg', 'sco', 'leo', 'gem', 'tau', 'lyr', 'sgr', 'and', 'peg', 'aur', 'per', 'mon', 'vir', 'lib', 'cap', 'aqr', 'psc']
featured = [item for item in data['constellations'] if item['id'] in featured_ids]
constellation_star_ids = {point for item in featured for point in item['points']}
brightest_stars = sorted(data['stars'], key=lambda star: (star['mag'], star['hr']))[:3000]
star_ids = constellation_star_ids | {star['hr'] for star in brightest_stars}
core_stars = [star for star in data['stars'] if star['hr'] in star_ids]
core = {
    'stars': core_stars,
    'constellations': featured,
    'meta': {
        **data['meta'],
        'initialStarCount': len(core_stars),
        'initialConstellationCount': len(featured),
    },
}

def emit(path: Path, payload: dict, header: str) -> None:
    path.write_text(header + 'export const SKY_DATA = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ' as const;\n', encoding='utf-8')

emit(root / 'client/src/data/skyDataCore.ts', core, '/* 首屏星空数据：约 3,000 个高亮度星点、20 个重点星座及其必要连线星点。完整数据由 skyData.ts 按需加载。 */\n')
(root / 'scripts/sky_data_split_report.json').write_text(json.dumps({
    'fullStars': len(data['stars']),
    'fullConstellations': len(data['constellations']),
    'coreStars': len(core_stars),
    'coreConstellations': len(featured),
    'coreStarIds': sorted(star_ids),
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'fullStars': len(data['stars']), 'fullConstellations': len(data['constellations']), 'coreStars': len(core_stars), 'coreConstellations': len(featured)}, ensure_ascii=False))
