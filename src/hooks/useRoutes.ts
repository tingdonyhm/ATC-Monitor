import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AIRPORTS } from '../data/airportData'

export interface RouteAirlineFlights {
  number: string | null
  time: string | null
  status: string | null
}
export interface RouteAirline {
  airline: string
  count: number
  flights: RouteAirlineFlights[]
}
export interface RouteDestination {
  dest: string
  name: string
  count: number
  airlines: RouteAirline[]
}

interface Network {
  a: Record<string, string>            // airline IATA -> name
  r: Record<string, Record<string, string[]>> // source -> dest -> [airline IATA]
}

// Static OpenFlights route network — free, no API, no quota. Loaded once.
let cached: Network | null = null
async function loadNetwork(): Promise<Network> {
  if (cached) return cached
  const res = await axios.get<Network>('/route-network.json', { timeout: 20000 })
  cached = res.data
  return cached
}

async function fetchRoutes(airport: string): Promise<RouteDestination[]> {
  const net = await loadNetwork()
  const dests = net.r[airport]
  if (!dests) return []
  return Object.entries(dests)
    .map(([dest, als]) => ({
      dest,
      name: AIRPORTS[dest]?.c || AIRPORTS[dest]?.n || dest,
      count: als.length,
      airlines: als
        .map(code => ({ airline: net.a[code] || code, count: 1, flights: [] as RouteAirlineFlights[] }))
        .sort((a, b) => a.airline.localeCompare(b.airline)),
    }))
    .sort((a, b) => b.count - a.count)
}

export function useRoutes(airport: string | null) {
  const code = (airport || '').trim().toUpperCase()
  return useQuery({
    queryKey: ['routes', code],
    queryFn: () => fetchRoutes(code),
    enabled: /^[A-Z]{3}$/.test(code),
    staleTime: Infinity,
    retry: 1,
  })
}
