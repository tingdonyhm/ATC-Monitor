import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
export function useAircraftPhoto(icao24: string | null) {
  return useQuery({
    queryKey: ['photo', icao24],
    queryFn: async () => {
      const res = await axios.get(`https://api.planespotters.net/pub/photos/hex/${icao24}`, { timeout: 5000 })
      return (res.data?.photos?.[0]?.thumbnail_large?.src ?? res.data?.photos?.[0]?.thumbnail?.src ?? null) as string | null
    },
    enabled: Boolean(icao24),
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
}
