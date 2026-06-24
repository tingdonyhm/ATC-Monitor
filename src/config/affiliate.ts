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
export function flightLink(originIata?: string | null, destIata?: string | null): string {
  const params = new URLSearchParams()
  if (originIata) params.set('origin_iata', originIata)
  if (destIata) params.set('destination_iata', destIata)
  if (AFFILIATE.marker) params.set('marker', AFFILIATE.marker)
  return `https://www.aviasales.com/search?${params.toString()}`
}
