import { AIRLINE_ICAO } from '../data/airlineIcao'
import { ICAO_TO_IATA } from '../data/airlineCodes'

export { ICAO_TO_IATA }

// Commercial airline flight = ICAO airline designator (a *real* 3-letter airline
// code) + a flight number. Checking the prefix against the known airline list
// excludes private/GA (N3499X, OKKAL), military (RCH…), and bizjet ops that the
// old "3 letters + digit" rule let through.
export function isAirlineCallsign(cs?: string | null): boolean {
  if (!cs) return false
  const s = cs.trim().toUpperCase()
  const m = s.match(/^([A-Z]{3})([A-Z0-9]+)$/)
  if (!m) return false
  return AIRLINE_ICAO.has(m[1]) && /\d/.test(m[2])
}

// Convert an ICAO callsign (e.g. "UAL234") to its IATA flight number (e.g. "UA234").
// Falls back to the original callsign when no mapping is known.
export function toIataCallsign(callsign: string | null | undefined): string {
  if (!callsign) return ''
  const cs = callsign.trim().toUpperCase()
  const m = cs.match(/^([A-Z]{3})(\d+[A-Z]?)$/)
  if (m && ICAO_TO_IATA[m[1]]) return ICAO_TO_IATA[m[1]] + m[2]
  return cs
}
