import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOpenSky } from './hooks/useOpenSky'
import { useAviationStack } from './hooks/useAviationStack'
import { useFlightRoutes } from './hooks/useFlightRoutes'
import { FlightMap } from './components/Map/FlightMap'
import { FlightTable } from './components/FlightTable/FlightTable'
import { IrregularOps } from './components/IrregularOps/IrregularOps'
import { StatsBar } from './components/StatsBar/StatsBar'
import { RefreshTimer } from './components/RefreshTimer/RefreshTimer'
import { AircraftState } from './types/flight'

export default function App() {
  const { data: aircraft = [], isLoading, dataUpdatedAt } = useOpenSky()
  const { data: iropsFlights = [] } = useAviationStack()
  const { data: routeMap = {} } = useFlightRoutes()
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'irops'>('map')
  const qc = useQueryClient()

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['opensky'] })
  }

  return (
    <div className="flex flex-col h-screen bg-navy overflow-hidden" style={{ background: '#0a0f1e' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-accent/20" style={{ background: '#080d1a' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-cyan-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wider glow-text leading-none">ATC MONITOR</h1>
              <p className="text-[10px] text-cyan-accent/60 tracking-widest uppercase">Live Air Traffic Control</p>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {(['map', 'table', 'irops'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-cyan-accent text-navy font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab === 'map' ? 'Live Map' : tab === 'table' ? 'Flight List' : 'IROPs'}
            </button>
          ))}
        </nav>

        <RefreshTimer
          intervalSeconds={10}
          lastRefresh={dataUpdatedAt / 1000}
          onManualRefresh={handleRefresh}
          isLoading={isLoading}
        />
      </header>

      {/* Stats Bar */}
      <StatsBar aircraft={aircraft} lastUpdated={dataUpdatedAt ? dataUpdatedAt / 1000 : null} />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'map' && (
          <div className="flex h-full">
            <div className="flex-1 min-w-0">
              <FlightMap
                aircraft={aircraft}
                selectedAircraft={selectedAircraft}
                onSelectAircraft={setSelectedAircraft}
                iropsFlights={iropsFlights}
                routeMap={routeMap}
              />
            </div>
            {selectedAircraft && (
              <div className="w-64 flex-shrink-0">
                <AircraftDetail aircraft={selectedAircraft} onClose={() => setSelectedAircraft(null)} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'table' && (
          <FlightTable
            aircraft={aircraft}
            selectedAircraft={selectedAircraft}
            onSelectAircraft={setSelectedAircraft}
          />
        )}

        {activeTab === 'irops' && (
          <IrregularOps />
        )}
      </main>
    </div>
  )
}

function AircraftDetail({ aircraft, onClose }: { aircraft: AircraftState; onClose: () => void }) {
  const fmtAlt = (m: number | null) => m !== null ? `${Math.round(m * 3.28084).toLocaleString()} ft` : 'N/A'
  const fmtSpd = (ms: number | null) => ms !== null ? `${Math.round(ms * 1.944)} kts` : 'N/A'
  const fmtVr = (ms: number | null) => ms !== null ? `${ms > 0 ? '+' : ''}${ms.toFixed(1)} m/s` : 'N/A'

  return (
    <div className="h-full bg-navy-light rounded-lg border border-cyan-accent/30 card-glow overflow-auto p-4" style={{ background: '#1a2235' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-cyan-accent font-bold font-mono text-lg glow-text">
          {aircraft.callsign || aircraft.icao24.toUpperCase()}
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs mb-4 ${
        aircraft.onGround
          ? 'bg-slate-700 text-slate-300 border border-slate-600'
          : 'bg-green-status/10 text-green-status border border-green-status/30'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${aircraft.onGround ? 'bg-slate-400' : 'bg-green-status pulse-cyan'}`} />
        {aircraft.onGround ? 'On Ground' : 'In Flight'}
      </div>

      <div className="space-y-3">
        <DetailSection title="Identification">
          <DetailRow label="ICAO24" value={aircraft.icao24.toUpperCase()} />
          <DetailRow label="Callsign" value={aircraft.callsign || '—'} />
          <DetailRow label="Origin" value={aircraft.originCountry} />
          {aircraft.squawk && <DetailRow label="Squawk" value={aircraft.squawk} />}
        </DetailSection>

        {(aircraft.departure || aircraft.arrival) && (
          <DetailSection title="Route">
            <DetailRow label="From" value={aircraft.departure || '—'} />
            <DetailRow label="To" value={aircraft.arrival || '—'} />
          </DetailSection>
        )}

        <DetailSection title="Position">
          <DetailRow label="Latitude" value={aircraft.latitude !== null ? aircraft.latitude.toFixed(4) + '°' : 'N/A'} />
          <DetailRow label="Longitude" value={aircraft.longitude !== null ? aircraft.longitude.toFixed(4) + '°' : 'N/A'} />
          <DetailRow label="Baro Alt" value={fmtAlt(aircraft.baroAltitude)} />
          <DetailRow label="Geo Alt" value={fmtAlt(aircraft.geoAltitude)} />
        </DetailSection>

        <DetailSection title="Movement">
          <DetailRow label="Speed" value={fmtSpd(aircraft.velocity)} />
          <DetailRow label="Heading" value={aircraft.trueTrack !== null ? `${Math.round(aircraft.trueTrack)}°` : 'N/A'} />
          <DetailRow label="Vert Rate" value={fmtVr(aircraft.verticalRate)} />
        </DetailSection>
      </div>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-cyan-accent/60 uppercase tracking-widest mb-1.5 font-semibold">{title}</div>
      <div className="bg-navy rounded p-2 space-y-1.5 border border-white/5">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-xs text-slate-200 font-mono">{value}</span>
    </div>
  )
}
