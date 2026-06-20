import React, { useState, useMemo } from 'react'
import { AircraftState } from '../../types/flight'
import { FlightRow } from './FlightRow'

interface Props {
  aircraft: AircraftState[]
  selectedAircraft: AircraftState | null
  onSelectAircraft: (ac: AircraftState) => void
}

export function FlightTable({ aircraft, selectedAircraft, onSelectAircraft }: Props) {
  const [filter, setFilter] = useState('')
  const [showOnlyInFlight, setShowOnlyInFlight] = useState(false)

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim()
    return aircraft
      .filter(a => !showOnlyInFlight || !a.onGround)
      .filter(a => {
        if (!q) return true
        return (
          (a.callsign?.toLowerCase().includes(q)) ||
          a.originCountry.toLowerCase().includes(q) ||
          a.icao24.toLowerCase().includes(q)
        )
      })
      .slice(0, 200)
  }, [aircraft, filter, showOnlyInFlight])

  return (
    <div className="flex flex-col h-full bg-navy-light rounded-lg border border-white/10 card-glow overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span className="text-sm font-semibold text-slate-200">Flight List</span>
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Filter by callsign, country..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-navy border border-white/10 rounded px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/50 font-mono"
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyInFlight}
            onChange={e => setShowOnlyInFlight(e.target.checked)}
            className="w-3 h-3 accent-cyan-500"
          />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">In flight only</span>
        </label>
        <span className="text-[10px] text-slate-600 font-mono">{filtered.length} shown</span>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-navy-card">
            <tr className="border-b border-white/10">
              <Th>Callsign</Th>
              <Th>Country</Th>
              <Th>Altitude</Th>
              <Th>Speed</Th>
              <Th>HDG</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ac => (
              <FlightRow
                key={ac.icao24}
                aircraft={ac}
                isSelected={selectedAircraft?.icao24 === ac.icao24}
                onSelect={onSelectAircraft}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-600 text-xs">
                  No aircraft matching filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-normal">
      {children}
    </th>
  )
}
