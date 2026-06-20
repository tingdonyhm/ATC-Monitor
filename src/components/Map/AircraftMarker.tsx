import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { AircraftState } from '../../types/flight'

interface Props {
  aircraft: AircraftState
  isSelected: boolean
  onSelect: (ac: AircraftState) => void
}

function createAircraftIcon(heading: number, onGround: boolean, isSelected: boolean) {
  const color = isSelected ? '#ffaa00' : onGround ? '#888888' : '#00d4ff'
  const size = isSelected ? 24 : 18
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <g transform="rotate(${heading}, 12, 12)">
        <path d="M12 2L8 10H4L6 12H9L7 20H10L12 16L14 20H17L15 12H18L20 10H16L12 2Z"
          fill="${color}" stroke="${isSelected ? '#ff8800' : '#003344'}" stroke-width="0.5"
          opacity="${onGround ? 0.5 : 1}"
        />
      </g>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'aircraft-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function formatAltitude(meters: number | null): string {
  if (meters === null) return 'N/A'
  return `${Math.round(meters * 3.28084).toLocaleString()} ft`
}

function formatSpeed(ms: number | null): string {
  if (ms === null) return 'N/A'
  return `${Math.round(ms * 1.944)} kts`
}

export function AircraftMarker({ aircraft, isSelected, onSelect }: Props) {
  if (aircraft.latitude === null || aircraft.longitude === null) return null

  const icon = createAircraftIcon(aircraft.trueTrack ?? 0, aircraft.onGround, isSelected)

  return (
    <Marker
      position={[aircraft.latitude, aircraft.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(aircraft) }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup>
        <div className="text-xs font-mono" style={{ minWidth: 200 }}>
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-cyan-accent/20">
            <span className="text-cyan-accent font-bold text-sm">
              {aircraft.callsign || aircraft.icao24.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] ${aircraft.onGround ? 'bg-gray-700 text-gray-300' : 'bg-cyan-accent/20 text-cyan-accent'}`}>
              {aircraft.onGround ? 'ON GROUND' : 'IN FLIGHT'}
            </span>
          </div>
          <div className="space-y-1">
            <Row label="ICAO24" value={aircraft.icao24.toUpperCase()} />
            <Row label="Country" value={aircraft.originCountry} />
            <Row label="Altitude" value={formatAltitude(aircraft.baroAltitude)} />
            <Row label="Speed" value={formatSpeed(aircraft.velocity)} />
            <Row label="Heading" value={aircraft.trueTrack !== null ? `${Math.round(aircraft.trueTrack)}°` : 'N/A'} />
            <Row label="Vert. Rate" value={aircraft.verticalRate !== null ? `${aircraft.verticalRate.toFixed(1)} m/s` : 'N/A'} />
            {aircraft.squawk && <Row label="Squawk" value={aircraft.squawk} />}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: '#94a3b8', fontSize: '10px' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: '10px' }}>{value}</span>
    </div>
  )
}
