import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { IrregularFlight } from '../types/flight'

const MOCK_IROPS: IrregularFlight[] = [
  { callsign: 'UA234',  airline: 'United Airlines',    departure: 'CLE', arrival: 'SFO', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T17:40:00+00:00', estimatedDep: '2024-01-15T17:40:00+00:00' },
  { callsign: 'DL426',  airline: 'Delta Air Lines',    departure: 'JFK', arrival: 'LAX', status: 'active',    delay: 95,   scheduledDep: '2024-01-15T09:00:00+00:00', estimatedDep: '2024-01-15T10:35:00+00:00' },
  { callsign: 'BA175',  airline: 'British Airways',    departure: 'LHR', arrival: 'JFK', status: 'diverted',  delay: 120,  scheduledDep: '2024-01-15T11:25:00+00:00', estimatedDep: '2024-01-15T13:25:00+00:00' },
  { callsign: 'AA100',  airline: 'American Airlines',  departure: 'JFK', arrival: 'LHR', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T22:45:00+00:00', estimatedDep: '2024-01-15T22:45:00+00:00' },
  { callsign: 'LH400',  airline: 'Lufthansa',          departure: 'FRA', arrival: 'JFK', status: 'active',    delay: 75,   scheduledDep: '2024-01-15T10:35:00+00:00', estimatedDep: '2024-01-15T11:50:00+00:00' },
  { callsign: 'WN100',  airline: 'Southwest Airlines', departure: 'DAL', arrival: 'HOU', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T06:00:00+00:00', estimatedDep: '2024-01-15T06:00:00+00:00' },
  { callsign: 'AF006',  airline: 'Air France',         departure: 'CDG', arrival: 'LAX', status: 'active',    delay: 110,  scheduledDep: '2024-01-15T13:30:00+00:00', estimatedDep: '2024-01-15T15:20:00+00:00' },
  { callsign: 'QR002',  airline: 'Qatar Airways',      departure: 'DOH', arrival: 'LHR', status: 'diverted',  delay: 60,   scheduledDep: '2024-01-15T08:30:00+00:00', estimatedDep: '2024-01-15T09:30:00+00:00' },
  { callsign: '6E441',  airline: 'IndiGo',             departure: 'DEL', arrival: 'BOM', status: 'active',    delay: 45,   scheduledDep: '2024-01-15T06:15:00+00:00', estimatedDep: '2024-01-15T07:00:00+00:00' },
  { callsign: 'AI101',  airline: 'Air India',          departure: 'DEL', arrival: 'JFK', status: 'active',    delay: 88,   scheduledDep: '2024-01-15T01:30:00+00:00', estimatedDep: '2024-01-15T02:58:00+00:00' },
  { callsign: 'EK202',  airline: 'Emirates',           departure: 'DXB', arrival: 'SYD', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T22:20:00+00:00', estimatedDep: '2024-01-15T22:20:00+00:00' },
  { callsign: 'KL862',  airline: 'KLM',                departure: 'AMS', arrival: 'NRT', status: 'active',    delay: 55,   scheduledDep: '2024-01-15T10:45:00+00:00', estimatedDep: '2024-01-15T11:40:00+00:00' },
]

async function fetchIrregularFlights(date?: string): Promise<IrregularFlight[]> {
  // Real feed via AeroDataBox airport FIDS (serverless proxy at /api/irops).
  // THROW on failure so React Query keeps the last good data and retries.
  const res = await axios.get<{ flights: IrregularFlight[] }>('/api/irops', {
    params: date ? { date } : {},
    timeout: 20000,
  })
  if (Array.isArray(res.data?.flights) && res.data.flights.length > 0) {
    return res.data.flights
  }
  throw new Error('no irops data')
}

export function useAviationStack(date?: string) {
  const isToday = !date
  const query = useQuery({
    queryKey: ['irops', 'aerodatabox', date ?? 'now'],
    queryFn: () => fetchIrregularFlights(date),
    enabled: true,
    initialData: isToday ? MOCK_IROPS : undefined,
    initialDataUpdatedAt: isToday ? 0 : undefined,
    refetchInterval: false,        // no timer auto-refresh
    refetchOnWindowFocus: false,   // don't refetch when tab regains focus
    refetchOnMount: false,         // don't refetch when re-opening the tab
    refetchOnReconnect: false,
    staleTime: Infinity,           // fetched data stays until a manual refresh
    retry: 1,
    retryDelay: 3000,
  })

  const isSample = query.data === MOCK_IROPS

  return { ...query, isSample }
}
