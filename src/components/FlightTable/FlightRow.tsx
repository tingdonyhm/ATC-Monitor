import React from 'react'
import { AircraftState } from '../../types/flight'

interface Props {
  aircraft: AircraftState
  isSelected: boolean
  onSelect: (ac: AircraftState) => void
  compareChecked?: boolean
  onToggleCompare?: () => void
  isFavorite?: boolean
  onToggleFavorite?: (icao: string) => void
  hasNotes?: boolean
}

function formatAlt(m: number | null) {
  if (m === null) return '—'
  return `${Math.round(m * 3.28084 / 100) * 100} ft`
}

function formatSpd(ms: number | null) {
  if (ms === null) return '—'
  return `${Math.round(ms * 1.944)} kt`
}

export function FlightRow({ aircraft, isSelected, onSelect, compareChecked, onToggleCompare, isFavorite, onToggleFavorite, hasNotes }: Props) {
  const statusColor = aircraft.onGround ? 'text-slate-500' : 'text-green-status'
  const statusLabel = aircraft.onGround ? 'GND' : 'FLT'

  return (
    <tr
      className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-cyan-accent/5 ${isSelected ? 'bg-cyan-accent/10' : ''}`}
      onClick={() => onSelect(aircraft)}
    >
      {onToggleCompare !== undefined && (
        <td className="px-2 py-2" onClick={e => { e.stopPropagation(); onToggleCompare() }}>
          <input
            type="checkbox"
            checked={compareChecked ?? false}
            onChange={onToggleCompare}
            className="w-3 h-3 accent-cyan-500 cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
        </td>
      )}
      <td className="px-3 py-2 text-cyan-accent font-mono text-xs font-semibold">
        <span className="flex items-center gap-1">
          {aircraft.callsign || <span className="text-slate-600">{aircraft.icao24.toUpperCase()}</span>}
          {hasNotes && <span title="Has notes" className="text-[9px]">📝</span>}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-slate-400">{aircraft.originCountry}</td>
      <td className="px-3 py-2 text-xs font-mono text-slate-300">{formatAlt(aircraft.baroAltitude)}</td>
      <td className="px-3 py-2 text-xs font-mono text-slate-300">{formatSpd(aircraft.velocity)}</td>
      <td className="px-3 py-2 text-xs font-mono text-slate-400">
        {aircraft.trueTrack !== null ? `${Math.round(aircraft.trueTrack)}°` : '—'}
      </td>
      <td className={`px-3 py-2 text-xs font-mono font-semibold ${statusColor}`}>{statusLabel}</td>
      {onToggleFavorite && (
        <td className="px-2 py-2" onClick={e => { e.stopPropagation(); onToggleFavorite(aircraft.icao24) }}>
          <button className={`text-sm transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-700 hover:text-amber-400'}`}>★</button>
        </td>
      )}
    </tr>
  )
}
