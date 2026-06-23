import React, { useState, useEffect } from 'react'
import { AircraftState } from '../../types/flight'

interface Props {
  aircraft: AircraftState[]
  lastUpdated: number | null
}

export function StatsBar({ aircraft, lastUpdated }: Props) {
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setUtcTime(
        now.toUTCString().split(' ')[4] + ' UTC'
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const inFlight = aircraft.filter(a => !a.onGround).length
  const onGround = aircraft.filter(a => a.onGround).length
  const countries = new Set(aircraft.map(a => a.originCountry)).size
  const withCallsign = aircraft.filter(a => a.callsign).length

  const timeStr = lastUpdated
    ? new Date(lastUpdated * 1000).toLocaleTimeString()
    : '--:--:--'

  return (
    <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-1.5 sm:py-3 bg-navy-light border-b border-cyan-accent/20 overflow-x-auto sm:flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-cyan-accent pulse-cyan" />
        <span className="hidden sm:inline text-xs text-slate-400 uppercase tracking-widest">Live ATC</span>
      </div>

      <StatItem label="Tracked" value={aircraft.length} color="text-cyan-accent" />
      <StatItem label="In Flight" value={inFlight} color="text-green-status" />
      <StatItem label="On Ground" value={onGround} color="text-slate-400" />
      <StatItem label="Countries" value={countries} color="text-amber-warn" />
      <StatItem label="Callsign" value={withCallsign} color="text-slate-300" />

      {/* Live UTC Clock */}
      <div className="flex flex-col items-center px-2 sm:px-3 py-0.5 sm:py-1 bg-navy-card rounded border border-cyan-accent/20 flex-shrink-0">
        <span className="text-sm sm:text-lg font-bold font-mono leading-none text-cyan-accent">{utcTime.split(' ')[0]}</span>
        <span className="text-[9px] sm:text-[10px] text-cyan-accent/60 uppercase tracking-wider mt-0.5">UTC</span>
      </div>

      <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
        <span>Last update:</span>
        <span className="text-cyan-accent font-mono">{timeStr}</span>
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-2 sm:px-3 py-0.5 sm:py-1 bg-navy-card rounded border border-white/5 flex-shrink-0">
      <span className={`text-sm sm:text-lg font-bold font-mono leading-none ${color}`}>{value.toLocaleString()}</span>
      <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  )
}
