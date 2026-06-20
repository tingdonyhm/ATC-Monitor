import React from 'react'
import { AircraftState } from '../../types/flight'

interface Props {
  aircraft: AircraftState[]
  lastUpdated: number | null
}

export function StatsBar({ aircraft, lastUpdated }: Props) {
  const inFlight = aircraft.filter(a => !a.onGround).length
  const onGround = aircraft.filter(a => a.onGround).length
  const countries = new Set(aircraft.map(a => a.originCountry)).size
  const withCallsign = aircraft.filter(a => a.callsign).length

  const timeStr = lastUpdated
    ? new Date(lastUpdated * 1000).toLocaleTimeString()
    : '--:--:--'

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-navy-light border-b border-cyan-accent/20">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-accent pulse-cyan" />
        <span className="text-xs text-slate-400 uppercase tracking-widest">Live ATC</span>
      </div>

      <StatItem label="Total Tracked" value={aircraft.length} color="text-cyan-accent" />
      <StatItem label="In Flight" value={inFlight} color="text-green-status" />
      <StatItem label="On Ground" value={onGround} color="text-slate-400" />
      <StatItem label="Countries" value={countries} color="text-amber-warn" />
      <StatItem label="With Callsign" value={withCallsign} color="text-slate-300" />

      <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
        <span>Last update:</span>
        <span className="text-cyan-accent font-mono">{timeStr}</span>
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1 bg-navy-card rounded border border-white/5">
      <span className={`text-lg font-bold font-mono leading-none ${color}`}>{value.toLocaleString()}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  )
}
