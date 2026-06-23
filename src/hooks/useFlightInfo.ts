import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { toIataCallsign } from '../utils/callsign'

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

async function fetchFlightInfo(callsign: string, date?: string): Promise<FlightInfo | null> {
  const number = toIataCallsign(callsign)
  try {
    const res = await axios.get<{ flight: FlightInfo | null }>('/api/flightinfo', {
      params: date ? { number, date } : { number },
      timeout: 10000,
    })
    return res.data?.flight ?? null
  } catch {
    return null
  }
}

export function useFlightInfo(callsign: string | null | undefined, date?: string) {
  const cs = callsign?.trim() || ''
  return useQuery({
    queryKey: ['flightinfo', cs, date ?? 'today'],
    queryFn: () => fetchFlightInfo(cs, date),
    enabled: cs.length >= 3,
    staleTime: 300000,
    retry: false,
  })
}
