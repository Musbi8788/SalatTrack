'use client'

import { useState, useEffect } from 'react'

const BANJUL_LAT = 13.4549
const BANJUL_LNG = -16.579
const BANJUL_CITY = 'Banjul, Gambia'

export interface LocationState {
  lat: number
  lng: number
  cityName: string
  loading: boolean
  permissionDenied: boolean
}

interface UseLocationProps {
  initialLat: number | null
  initialLng: number | null
  initialCityName: string | null
}

export function useLocation({
  initialLat,
  initialLng,
  initialCityName,
}: UseLocationProps): LocationState {
  const [state, setState] = useState<LocationState>({
    lat: initialLat ?? BANJUL_LAT,
    lng: initialLng ?? BANJUL_LNG,
    cityName: initialCityName ?? BANJUL_CITY,
    loading: true,
    permissionDenied: false,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          cityName: initialCityName ?? 'Your Location',
          loading: false,
          permissionDenied: false,
        })
      },
      () => {
        // Denied or timed out — fall back to stored profile location or Banjul
        setState({
          lat: initialLat ?? BANJUL_LAT,
          lng: initialLng ?? BANJUL_LNG,
          cityName: initialCityName ?? BANJUL_CITY,
          loading: false,
          permissionDenied: true,
        })
      },
      { timeout: 5000 }
    )
  }, [initialLat, initialLng, initialCityName])

  return state
}
