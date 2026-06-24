// ─────────────────────────────────────────────────────────────────────────
//  AFFILIATE CONFIG  —  paste your Travelpayouts marker (ID) below.
//  Sign up free at https://www.travelpayouts.com , get your marker, and set it
//  here. Until then the buttons still work as normal links (just no commission).
// ─────────────────────────────────────────────────────────────────────────
export const AFFILIATE = {
  marker: '543116', // Travelpayouts marker
}

// Hotel search for a city (Hotellook, a Travelpayouts brand).
export function hotelLink(city?: string | null): string {
  const params = new URLSearchParams()
  if (city) params.set('destination', city)
  if (AFFILIATE.marker) params.set('marker', AFFILIATE.marker)
  return `https://search.hotellook.com/?${params.toString()}`
}

// Flight search between two airports (Aviasales, a Travelpayouts brand).
// Uses Aviasales' path format (ORIGIN+DDMM+DEST+passengers) with a default
// departure ~2 weeks out so the search launches immediately instead of erroring.
export function flightLink(originIata?: string | null, destIata?: string | null, departISO?: string | null): string {
  const marker = AFFILIATE.marker ? `?marker=${AFFILIATE.marker}` : ''
  if (originIata && destIata) {
    const d = departISO ? new Date(departISO) : new Date(Date.now() + 14 * 86400000)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `https://www.aviasales.com/search/${originIata}${dd}${mm}${destIata}1${marker}`
  }
  return `https://www.aviasales.com/${marker}`
}
