/** Place lookup for the birthplace picker; single owner of place search. */
import { PLACES_DATA } from "./places-data";

export interface Place {
  /** Short display name, e.g. 南宁、东京. */
  name: string;
  /** Province for Chinese cities, country for overseas; "" when same as name. */
  region: string;
  lon: number;
  lat: number;
  timezone: string;
}

export const PLACES: readonly Place[] = PLACES_DATA;

/** Strips administrative suffixes so 南宁市、广西省 still match. */
function normalizeQuery(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .replace(/壮族|维吾尔|回族|特别行政区|自治区|省|市/g, "");
}

function searchable(place: Place): string {
  return `${place.name}${place.region}`;
}

function rank(place: Place, query: string): number {
  if (place.name === query) return 0;
  if (place.name.startsWith(query)) return 1;
  const text = searchable(place);
  if (text.includes(query)) return 2;
  if (query.includes(place.name)) return 3;
  return -1;
}

/** Deterministic ranked search; empty query returns []. */
export function searchPlaces(raw: string, limit = 8): Place[] {
  const query = normalizeQuery(raw);
  if (!query) return [];
  const scored: Array<{ place: Place; score: number }> = [];
  for (const place of PLACES) {
    const score = rank(place, query);
    if (score >= 0) scored.push({ place, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((entry) => entry.place);
}
