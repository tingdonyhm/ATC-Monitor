import React from 'react'
import { AircraftState } from '../../types/flight'

interface Props {
  aircraft: AircraftState
  isSelected: boolean
  onSelect: (ac: AircraftState) => void
}

function formatAlt(m: number | null) {
  if (m === null) return '—'
  return `${Math.round(m * 3.28084 / 100) * 100} ft`
}

function formatSpd(ms: number | null) {
  if (ms === null) return '—'
  return `${Math.round(ms * 1.944)} kt`
}

export function FlightRow({ aircraft, isSelected, onSelect }: Props) {
  const statusColor = aircraft.onGround ? 'text-slate-500' : 'text-green-status'
  const statusLabel = aircraft.onGround ? 'GND' : 'FLT'

  return (
    <tr
      className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-cyan-accent/5 ${isSelected ? 'bg-cyan-accent/10' : ''}`}
      onClick={() => onSelect(aircraft)}
    >
      <td className="px-3 py-2 text-cyan-accent font-mono text-xs font-semibold">
        {aircraft.callsign || <span className="text-slate-600">{aircraft.icao24.toUpperCase()}</span>}
      </td>
      <td className="px-3 py-2 text-xs text-slate-400">{aircraft.originCountry}</td>
      <td className="px-3 py-2 text-xs font-mono text-slate-300">{formatAlt(aircraft.baroAltitude)}</td>
      <td className="px-3 py-2 text-xs font-mono text-slate-300">{formatSpd(aircraft.velocity)}</td>
      <td className="px-3 py-2 text-xs font-mono text-slate-400">
        {aircraft.trueTrack !== null ? `${Math.round(aircraft.trueTrack)}°` : '—'}
      </td>
      <td className={`px-3 py-2 text-xs font-mono font-semibold ${statusColor}`}>{statusLabel}</td>
    </tr>
  )
}
