import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AviationStackResponse, IrregularFlight } from '../types/flight'

const API_KEY = import.meta.env.VITE_AVIATIONSTACK_API_KEY as string | undefined

async function fetchIrregularFlights(): Promise<IrregularFlight[]> {
  if (!API_KEY) {
    throw new Error('NO_API_KEY')
  }

  const statuses = ['cancelled', 'diverted']
  const results: IrregularFlight[] = []

  for (const status of statuses) {
    try {
      const res = await axios.get<AviationStackResponse>('/aviationstack/v1/flights', {
        params: {
          access_key: API_KEY,
          flight_status: status,
          limit: 20,
        },
        timeout: 10000,
      })
      if (res.data?.data) {
        for (const f of res.data.data) {
          results.push({
            callsign: f.flight.iata || f.flight.icao || 'N/A',
            airline: f.airline.name,
            departure: f.departure.iata || f.departure.airport,
            arrival: f.arrival.iata || f.arrival.airport,
            status: f.flight_status as IrregularFlight['status'],
            delay: f.departure.delay,
            scheduledDep: f.departure.scheduled,
            estimatedDep: f.departure.estimated,
          })
        }
      }
    } catch {
      // continue with other statuses
    }
  }

  // also fetch delayed flights
  try {
    const res = await axios.get<AviationStackResponse>('/aviationstack/v1/flights', {
      params: {
        access_key: API_KEY,
        flight_status: 'active',
        limit: 50,
      },
      timeout: 10000,
    })
    if (res.data?.data) {
      for (const f of res.data.data) {
        if (f.departure.delay && f.departure.delay > 15) {
          results.push({
            callsign: f.flight.iata || f.flight.icao || 'N/A',
            airline: f.airline.name,
            departure: f.departure.iata || f.departure.airport,
            arrival: f.arrival.iata || f.arrival.airport,
            status: 'active',
            delay: f.departure.delay,
            scheduledDep: f.departure.scheduled,
            estimatedDep: f.departure.estimated,
          })
        }
      }
    }
  } catch {
    // silently fail
  }

  return results
}

export function useAviationStack() {
  const hasKey = Boolean(API_KEY)

  const query = useQuery({
    queryKey: ['aviationstack', 'irregular'],
    queryFn: fetchIrregularFlights,
    enabled: hasKey,
    refetchInterval: 60000,
    staleTime: 55000,
    retry: (_, error) => {
      if (error instanceof Error && error.message === 'NO_API_KEY') return false
      return true
    },
  })

  return { ...query, hasKey }
}
