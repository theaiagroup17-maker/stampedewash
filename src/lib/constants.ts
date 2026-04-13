// Calgary center coordinates
export const CALGARY_CENTER = { lat: 51.0447, lng: -114.0719 };
export const DEFAULT_ZOOM = 11;

// Status colors for Stampede Wash site pins
export const STATUS_COLORS = {
  potential_unranked: '#F59E0B', // Gold
  ranked: '#CC0000',            // Red
  ruled_out: '#6B7280',         // Grey
  under_negotiation: '#EA580C', // Orange
} as const;

// Duplicate site pairs (near-identical coordinates)
export const DUPLICATE_PAIRS = [
  { siteIndex: 7, duplicateOf: 6 }, // site 8 (0-indexed 7) is duplicate of site 7 (0-indexed 6)
];

// Seed sites — format: [lng, lat]
export const SEED_SITES: [number, number][] = [
  [-113.9120962, 51.0427979],
  [-114.2092220, 51.1530581],
  [-114.2099145, 51.0425652],
  [-114.1373441, 51.0416169],
  [-114.1599114, 51.0014948],
  [-114.0630864, 50.8999904],
  [-113.9577255, 50.8791677],
  [-113.9577255, 50.8791406], // possible duplicate of site 7
  [-114.0699101, 50.9711396],
  [-114.0646717, 51.0138369],
  [-114.0657124, 51.0119536],
  [-114.0818139, 51.0672269],
  [-114.0877101, 51.0672585],
  [-113.9593688, 51.0992408],
  [-113.9894151, 51.2093855],
  [-114.0244724, 51.2840236],
  [-114.1186967, 50.9634848],
  [-114.0850422, 50.9482117],
  [-114.2050901, 51.1253344],
  [-114.1423690, 51.1712329],
  [-113.8459424, 51.0373752],
  [-114.0720288, 51.1259556],
  [-114.1612665, 51.1381103],
  [-114.0405559, 50.9845194],
];

export const MOUNTAIN_TZ = 'America/Edmonton';

export function formatMountainTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: MOUNTAIN_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
