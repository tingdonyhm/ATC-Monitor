import React from 'react'
import { useAviationStack } from '../../hooks/useAviationStack'
import { IrregularFlight } from '../../types/flight'

const FALLBACK_IROPS: IrregularFlight[] = [
  { callsign: 'UAL234', airline: 'United Airlines', departure: 'ORD', arrival: 'LAX', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T08:00:00+00:00', estimatedDep: '2024-01-15T08:00:00+00:00' },
  { callsign: 'DAL891', airline: 'Delta Air Lines', departure: 'ATL', arrival: 'JFK', status: 'active', delay: 95, scheduledDep: '2024-01-15T09:30:00+00:00', estimatedDep: '2024-01-15T11:05:00+00:00' },
  { callsign: 'BAW117', airline: 'British Airways', departure: 'LHR', arrival: 'BOS', status: 'diverted', delay: 120, scheduledDep: '2024-01-15T10:00:00+00:00', estimatedDep: '2024-01-15T12:00:00+00:00' },
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

export function IrregularOps() {
  const { data, isLoading } = useAviationStack()
  const flights: IrregularFlight[] = (data && data.length > 0) ? data : FALLBACK_IROPS

  const statusConfig = {
    cancelled: { color: 'text-red-alert', bg: 'bg-red-alert/10', border: 'border-red-alert/30', label: 'CANCELLED' },
    diverted: { color: 'text-amber-warn', bg: 'bg-amber-warn/10', border: 'border-amber-warn/30', label: 'DIVERTED' },
    active: { color: 'text-cyan-accent', bg: 'bg-cyan-accent/10', border: 'border-cyan-accent/30', label: 'DELAYED' },
    scheduled: { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30', label: 'SCHEDULED' },
    landed: { color: 'text-green-status', bg: 'bg-green-status/10', border: 'border-green-status/30', label: 'LANDED' },
    incident: { color: 'text-red-alert', bg: 'bg-red-alert/10', border: 'border-red-alert/30', label: 'INCIDENT' },
  } as const

  return (
    <div className="flex flex-col h-full bg-navy-light rounded-lg border border-white/10 card-glow overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-alert pulse-cyan" />
        <span className="text-sm font-semibold text-slate-200">Irregular Operations</span>
        <span className="ml-auto bg-red-alert/20 text-red-alert text-[10px] px-2 py-0.5 rounded-full border border-red-alert/30">
            {flights.length} active
          </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-2">
            {flights.map((flight: IrregularFlight, i: number) => {
              const cfg = statusConfig[flight.status] ?? statusConfig.active
              return (
                <div key={i} className={`p-3 rounded-lg border ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold font-mono text-white">{flight.callsign}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.color} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span>{flight.departure}</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span>{flight.arrival}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{flight.airline}</span>
                    {flight.delay && flight.delay > 0 && (
                      <span className="text-amber-warn">+{flight.delay} min delay</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
      </div>
    </div>
  )
}
