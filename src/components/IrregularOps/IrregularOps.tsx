import React from 'react'
import { useAviationStack } from '../../hooks/useAviationStack'
import { IrregularFlight } from '../../types/flight'

export function IrregularOps() {
  const { data, isLoading, error, hasKey } = useAviationStack()

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
        {data && data.length > 0 && (
          <span className="ml-auto bg-red-alert/20 text-red-alert text-[10px] px-2 py-0.5 rounded-full border border-red-alert/30">
            {data.length} active
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {!hasKey && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-warn/10 border border-amber-warn/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <p className="text-amber-warn text-sm font-semibold mb-1">API Key Required</p>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
                Add <code className="text-cyan-accent bg-navy px-1 py-0.5 rounded">VITE_AVIATIONSTACK_API_KEY</code> to <code className="text-cyan-accent bg-navy px-1 py-0.5 rounded">.env</code> to enable flight status data
              </p>
            </div>
            <a
              href="https://aviationstack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-accent hover:underline mt-1"
            >
              Get a free API key at aviationstack.com →
            </a>
          </div>
        )}

        {hasKey && isLoading && (
          <div className="flex items-center justify-center h-full gap-2">
            <div className="w-4 h-4 border-2 border-cyan-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 text-xs">Fetching irregular operations...</span>
          </div>
        )}

        {hasKey && error && !(error instanceof Error && error.message === 'NO_API_KEY') && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-red-alert text-xs">Failed to fetch data</span>
            <span className="text-slate-600 text-[10px]">Check your API key and try again</span>
          </div>
        )}

        {hasKey && data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-green-status/10 border border-green-status/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-status" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <p className="text-green-status text-xs">No irregular operations detected</p>
          </div>
        )}

        {hasKey && data && data.length > 0 && (
          <div className="space-y-2">
            {data.map((flight: IrregularFlight, i: number) => {
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
        )}
      </div>
    </div>
  )
}
