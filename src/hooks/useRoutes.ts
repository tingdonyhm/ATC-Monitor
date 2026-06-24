import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

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

async function fetchRoutes(airport: string): Promise<RouteDestination[]> {
  const res = await axios.get<{ routes: RouteDestination[] }>('/api/routes', {
    params: { airport },
    timeout: 20000,
  })
  if (!Array.isArray(res.data?.routes)) throw new Error('no routes')
  return res.data.routes
}

export function useRoutes(airport: string | null) {
  const code = (airport || '').trim().toUpperCase()
  return useQuery({
    queryKey: ['routes', code],
    queryFn: () => fetchRoutes(code),
    enabled: /^[A-Z]{3}$/.test(code),
    staleTime: 1800000,
    retry: 1,
  })
}
