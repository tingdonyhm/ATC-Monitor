import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface FlightLeg {
  airport: string | null
  name: string | null
  scheduled: string | null
  actual: string | null
  terminal: string | null
  gate: string | null
}

export interface FlightInfo {
  number: string
  airline: string | null
  status: string | null
  departure: FlightLeg
  arrival: FlightLeg
}

// ICAO airline prefix (3-letter, from ADS-B callsigns) -> IATA (2-letter, for AeroDataBox)
const ICAO_TO_IATA: Record<string, string> = {
  UAL: 'UA', DAL: 'DL', AAL: 'AA', SWA: 'WN', BAW: 'BA', DLH: 'LH',
  AFR: 'AF', KLM: 'KL', UAE: 'EK', QTR: 'QR', AIC: 'AI', IGO: '6E',
  SIA: 'SQ', CPA: 'CX', JAL: 'JL', ANA: 'NH', QFA: 'QF', ACA: 'AC',
  THY: 'TK', RYR: 'FR', EZY: 'U2', VIR: 'VS', ETH: 'ET', SAS: 'SK',
}

function normalizeNumber(callsign: string): string {
  const cs = callsign.trim().toUpperCase()
  const m = cs.match(/^([A-Z]{3})(\d+[A-Z]?)$/)
  if (m && ICAO_TO_IATA[m[1]]) return ICAO_TO_IATA[m[1]] + m[2]
  return cs
}

async function fetchFlightInfo(callsign: string): Promise<FlightInfo | null> {
  const number = normalizeNumber(callsign)
  try {
    const res = await axios.get<{ flight: FlightInfo | null }>('/api/flightinfo', {
      params: { number },
      timeout: 10000,
    })
    return res.data?.flight ?? null
  } catch {
    return null
  }
}

export function useFlightInfo(callsign: string | null | undefined) {
  const cs = callsign?.trim() || ''
  return useQuery({
    queryKey: ['flightinfo', cs],
    queryFn: () => fetchFlightInfo(cs),
    enabled: cs.length >= 3,
    staleTime: 300000,
    retry: false,
  })
}
