import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface FlightRoute {
  icao24: string
  callsign: string | null
  estDepartureAirport: string | null
  estArrivalAirport: string | null
}

async function fetchFlightRoutes(): Promise<Record<string, FlightRoute>> {
  const now = Math.floor(Date.now() / 1000)
  const begin = now - 7200 // 2 hours ago

  try {
    const res = await axios.get<FlightRoute[]>('/opensky/api/flights/all', {
      params: { begin, end: now },
      timeout: 10000,
    })
    if (Array.isArray(res.data)) {
      const map: Record<string, FlightRoute> = {}
      for (const f of res.data) {
        if (f.icao24) {
          map[f.icao24.toLowerCase()] = f
        }
      }
      return map
    }
  } catch {
    // silently fail — routes are optional enhancement
  }
  return {}
}

export function useFlightRoutes() {
  return useQuery({
    queryKey: ['flightRoutes'],
    queryFn: fetchFlightRoutes,
    refetchInterval: 120000, // refresh every 2 min
    staleTime: 115000,
  })
}
