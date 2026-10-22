// Public-domain geographic data, not component/renderer code.
import { writeFile } from 'node:fs/promises';
const source = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson';
const response = await fetch(source);
if (!response.ok) throw new Error(`City data: ${response.status}`);
const data = await response.json();
const cities = data.features.map(({ properties: p, geometry: g }) => [p.name, p.adm0name, g.coordinates[1], g.coordinates[0]]);
await writeFile(new URL('../public/data/globe-places.json', import.meta.url), JSON.stringify(cities));
console.log(`Generated ${cities.length} local city references from Natural Earth.`);
