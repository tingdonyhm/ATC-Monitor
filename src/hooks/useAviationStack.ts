import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AviationStackResponse, IrregularFlight } from '../types/flight'

const API_KEY = import.meta.env.VITE_AVIATIONSTACK_API_KEY as string | undefined

const MOCK_IROPS: IrregularFlight[] = [
  { callsign: 'UAL234', airline: 'United Airlines', departure: 'ORD', arrival: 'LAX', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T08:00:00+00:00', estimatedDep: '2024-01-15T08:00:00+00:00' },
  { callsign: 'DAL891', airline: 'Delta Air Lines', departure: 'ATL', arrival: 'JFK', status: 'active', delay: 95, scheduledDep: '2024-01-15T09:30:00+00:00', estimatedDep: '2024-01-15T11:05:00+00:00' },
  { callsign: 'BAW117', airline: 'British Airways', departure: 'LHR', arrival: 'JFK', status: 'diverted', delay: 120, scheduledDep: '2024-01-15T10:00:00+00:00', estimatedDep: '2024-01-15T12:00:00+00:00' },
  { callsign: 'AAL445', airline: 'American Airlines', departure: 'MIA', arrival: 'DFW', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T11:00:00+00:00', estimatedDep: '2024-01-15T11:00:00+00:00' },
  { callsign: 'DLH401', airline: 'Lufthansa', departure: 'FRA', arrival: 'JFK', status: 'active', delay: 75, scheduledDep: '2024-01-15T12:00:00+00:00', estimatedDep: '2024-01-15T13:15:00+00:00' },
  { callsign: 'SWA772', airline: 'Southwest Airlines', departure: 'DEN', arrival: 'PHX', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T13:00:00+00:00', estimatedDep: '2024-01-15T13:00:00+00:00' },
  { callsign: 'AFR321', airline: 'Air France', departure: 'CDG', arrival: 'LAX', status: 'active', delay: 110, scheduledDep: '2024-01-15T14:00:00+00:00', estimatedDep: '2024-01-15T15:50:00+00:00' },
  { callsign: 'QTR552', airline: 'Qatar Airways', departure: 'DOH', arrival: 'LHR', status: 'diverted', delay: 60, scheduledDep: '2024-01-15T15:00:00+00:00', estimatedDep: '2024-01-15T16:00:00+00:00' },
  { callsign: 'IGO341', airline: 'IndiGo', departure: 'DEL', arrival: 'BOM', status: 'active', delay: 45, scheduledDep: '2024-01-15T06:00:00+00:00', estimatedDep: '2024-01-15T06:45:00+00:00' },
  { callsign: 'AIC102', airline: 'Air India', departure: 'BOM', arrival: 'LHR', status: 'active', delay: 88, scheduledDep: '2024-01-15T07:00:00+00:00', estimatedDep: '2024-01-15T08:28:00+00:00' },
  { callsign: 'UAE519', airline: 'Emirates', departure: 'DXB', arrival: 'SYD', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T16:00:00+00:00', estimatedDep: '2024-01-15T16:00:00+00:00' },
  { callsign: 'KLM671', airline: 'KLM', departure: 'AMS', arrival: 'NRT', status: 'active', delay: 55, scheduledDep: '2024-01-15T08:30:00+00:00', estimatedDep: '2024-01-15T09:25:00+00:00' },
]

async function fetchIrregularFlights(): Promise<IrregularFlight[]> {
  if (!API_KEY) {
    return MOCK_IROPS
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

  return results.length > 0 ? results : MOCK_IROPS
}

export function useAviationStack() {
  const hasKey = Boolean(API_KEY)

  const query = useQuery({
    queryKey: ['aviationstack', 'irregular'],
    queryFn: fetchIrregularFlights,
    enabled: true,
    initialData: MOCK_IROPS,
    refetchInterval: 1800000, // 30 min — AviationStack free tier is 100 req/month
    staleTime: 1795000,
    retry: false,
  })

  return { ...query, hasKey }
}
