import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOpenSky } from './hooks/useOpenSky'
import { useAviationStack } from './hooks/useAviationStack'
import { useFlightRoutes } from './hooks/useFlightRoutes'
import { useAircraftPhoto } from './hooks/useAircraftPhoto'
import { useFlightInfo } from './hooks/useFlightInfo'
import { toIataCallsign } from './utils/callsign'
import { tzOffsetLabel } from './utils/time'
import { FlightMap } from './components/Map/FlightMap'
import { FlightStatusPage } from './components/FlightStatus/FlightStatusPage'
import { IrregularOps, FALLBACK_IROPS } from './components/IrregularOps/IrregularOps'
import { RouteGuide } from './components/RouteGuide/RouteGuide'
import { StatsBar } from './components/StatsBar/StatsBar'
import { RefreshTimer } from './components/RefreshTimer/RefreshTimer'
import { StatsDashboard } from './components/Stats/StatsDashboard'
import { FlightLog, LogEvent } from './components/FlightLog/FlightLog'
import { AlertRulesModal, useAlertRules } from './components/AlertRules/AlertRules'
import { AircraftState } from './types/flight'
import { getAirportName, getAirportCoords, AIRPORTS_BY_IATA } from './data/airports'

interface PositionSnapshot {
  ts: number
  positions: Record<string, { lat: number; lon: number; heading: number }>
}

interface Alert {
  id: number
  callsign: string
  status: string
  color: string
}

const EMERGENCY_SQUAWKS: Record<string, { label: string; color: string }> = {
  '7500': { label: 'HIJACK', color: '#ff2222' },
  '7600': { label: 'RADIO FAIL', color: '#ffaa00' },
  '7700': { label: 'EMERGENCY', color: '#ff2222' },
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function playAlertSound(type: 'cancelled' | 'diverted' | 'delayed') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = type === 'cancelled' ? 220 : type === 'diverted' ? 330 : 440
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch { /* audio not available */ }
}

function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('atc_favorites') || '[]')) } catch { return new Set() }
}
function saveFavorites(s: Set<string>) {
  localStorage.setItem('atc_favorites', JSON.stringify([...s]))
}
function loadNotes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('atc_notes') || '{}') } catch { return {} }
}
function saveNotes(n: Record<string, string>) {
  localStorage.setItem('atc_notes', JSON.stringify(n))
}

export default function App() {
  const { data: aircraft = [], isLoading, dataUpdatedAt, isMock } = useOpenSky()
  const { data: iropsRaw = [] } = useAviationStack()
  const iropsFlights = iropsRaw.length > 0 ? iropsRaw : FALLBACK_IROPS
  const { data: routeMap = {} } = useFlightRoutes()
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'status' | 'irops' | 'stats' | 'dashboard' | 'routes'>('map')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [log, setLog] = useState<LogEvent[]>([])
  const [showLog, setShowLog] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())
  const [positionHistory, setPositionHistory] = useState<PositionSnapshot[]>([])
  const [historyIdx, setHistoryIdx] = useState<number | null>(null)
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set())
  const [showAlertRules, setShowAlertRules] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('atc_dark_mode')
    return stored === null ? true : stored === 'true'
  })
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes)
  const [emergencyAircraft, setEmergencyAircraft] = useState<{ icao24: string; callsign: string; squawk: string }[]>([])
  const prevIropsRef = useRef<Set<string>>(new Set())
  const alertIdRef = useRef(0)
  const logIdRef = useRef(0)
  const hasRestoredRef = useRef(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const prevEmergencyRef = useRef<Set<string>>(new Set())
  const qc = useQueryClient()

  // Apply dark/light mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('atc_dark_mode', String(darkMode))
  }, [darkMode])

  const addLog = useCallback((msg: string, type: 'info' | 'alert' = 'alert') => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false })
    const event: LogEvent = { id: logIdRef.current++, time: timeStr, type, message: msg }
    setLog(prev => [...prev, event].slice(-50))
    setUnreadCount(prev => prev + 1)
  }, [])

  useAlertRules(aircraft, (msg) => addLog(msg, 'alert'))

  // Reset unread when log is opened
  useEffect(() => {
    if (showLog) setUnreadCount(0)
  }, [showLog])

  // URL hash restoration
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const hash = window.location.hash.slice(1)
    if (hash && aircraft.length > 0) {
      const found = aircraft.find(ac => ac.icao24 === hash)
      if (found) {
        setSelectedAircraft(found)
        setActiveTab('map')
      }
    }
  }, [aircraft])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Position history snapshots every 30s
  useEffect(() => {
    if (aircraft.length === 0) return
    const snap: PositionSnapshot = { ts: Date.now(), positions: {} }
    for (const ac of aircraft) {
      if (ac.latitude !== null && ac.longitude !== null) {
        snap.positions[ac.icao24] = { lat: ac.latitude, lon: ac.longitude, heading: ac.trueTrack ?? 0 }
      }
    }
    setPositionHistory(prev => [...prev, snap].slice(-20))
    setHistoryIdx(null)
  }, [Math.floor(Date.now() / 30000)])

  // Emergency squawk detection
  useEffect(() => {
    if (aircraft.length === 0) return
    const emergencies = aircraft.filter(ac => ac.squawk && EMERGENCY_SQUAWKS[ac.squawk])
    const newEmergencies = emergencies.filter(ac => !prevEmergencyRef.current.has(ac.icao24))
    for (const ac of newEmergencies) {
      const info = EMERGENCY_SQUAWKS[ac.squawk!]
      addLog(`🚨 EMERGENCY SQUAWK ${ac.squawk} (${info.label}): ${ac.callsign || ac.icao24.toUpperCase()}`, 'alert')
    }
    prevEmergencyRef.current = new Set(emergencies.map(ac => ac.icao24))
    setEmergencyAircraft(emergencies.map(ac => ({ icao24: ac.icao24, callsign: ac.callsign || ac.icao24.toUpperCase(), squawk: ac.squawk! })))
  }, [aircraft])

  // Detect new IROPs and fire alerts
  useEffect(() => {
    const prevKeys = prevIropsRef.current
    const newAlerts: Alert[] = []
    for (const f of iropsFlights) {
      const key = `${f.callsign}-${f.status}`
      if (!prevKeys.has(key)) {
        const color = f.status === 'cancelled' ? '#ff4444' : f.status === 'diverted' ? '#ff9900' : '#ffdd00'
        newAlerts.push({ id: alertIdRef.current++, callsign: f.callsign, status: f.status, color })
        if (soundEnabled) playAlertSound(f.status as any)
      }
    }
    prevIropsRef.current = new Set(iropsFlights.map(f => `${f.callsign}-${f.status}`))
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts].slice(-5))
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => !newAlerts.find(n => n.id === a.id)))
      }, 5000)
    }
  }, [iropsFlights])

  // Aircraft data update: log events + conflict detection
  useEffect(() => {
    if (aircraft.length === 0) return
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false })
    const newEvents: LogEvent[] = []
    const sample = aircraft.slice(0, 3)
    for (const ac of sample) {
      if (ac.callsign && !ac.onGround) {
        const kts = ac.velocity ? Math.round(ac.velocity * 1.944) : 0
        const ft = ac.baroAltitude ? Math.round(ac.baroAltitude * 3.28084) : 0
        newEvents.push({ id: logIdRef.current++, time: timeStr, type: 'info', message: `${toIataCallsign(ac.callsign)} — ${ft.toLocaleString()}ft @ ${kts}kts` })
      }
    }
    if (newEvents.length > 0) {
      setLog(prev => [...prev, ...newEvents].slice(-50))
      if (!showLog) setUnreadCount(prev => prev + newEvents.length)
    }

    // Conflict = genuinely close: within 5nm laterally AND 1000ft vertically.
    // Uses a spatial grid so we only compare nearby aircraft (not every pair).
    const inFlight = aircraft.filter(ac => !ac.onGround && ac.latitude !== null && ac.longitude !== null)
    const newConflicts = new Set<string>()
    const CELL = 0.5 // degrees (~30nm) — neighbors cover the 5nm test
    const grid = new Map<string, AircraftState[]>()
    for (const ac of inFlight) {
      const k = `${Math.floor(ac.latitude! / CELL)},${Math.floor(ac.longitude! / CELL)}`
      const bucket = grid.get(k)
      if (bucket) bucket.push(ac); else grid.set(k, [ac])
    }
    for (const a of inFlight) {
      const cy = Math.floor(a.latitude! / CELL), cx = Math.floor(a.longitude! / CELL)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighbors = grid.get(`${cy + dy},${cx + dx}`)
          if (!neighbors) continue
          for (const b of neighbors) {
            if (b.icao24 <= a.icao24) continue // each pair once, skip self
            if (a.baroAltitude !== null && b.baroAltitude !== null && Math.abs(a.baroAltitude - b.baroAltitude) > 305) continue
            const dist = haversineKm(a.latitude!, a.longitude!, b.latitude!, b.longitude!)
            if (dist < 9.26) { newConflicts.add(a.icao24); newConflicts.add(b.icao24) }
          }
        }
      }
    }
    setConflicts(newConflicts)
    if (newConflicts.size > 0) {
      const conflictTime = new Date().toLocaleTimeString('en-US', { hour12: false })
      setLog(prev => [...prev, { id: logIdRef.current++, time: conflictTime, type: 'alert', message: `⚠ ${newConflicts.size} aircraft in potential conflict proximity` }].slice(-50))
      if (!showLog) setUnreadCount(prev => prev + 1)
    }
  }, [aircraft])

  // Close search on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['opensky'] })
    qc.refetchQueries({ queryKey: ['opensky'] })
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const handleToggleFavorite = (icao: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(icao)) next.delete(icao); else next.add(icao)
      saveFavorites(next)
      return next
    })
  }

  const handleSaveNote = (icao: string, text: string) => {
    setNotes(prev => {
      const next = { ...prev, [icao]: text }
      saveNotes(next)
      return next
    })
  }

  const searchResults = searchQuery.trim().length > 0
    ? aircraft.filter(ac => {
        const q = searchQuery.trim().toLowerCase()
        const route = routeMap[ac.icao24.toLowerCase()]
        const dep = (ac.departure || route?.estDepartureAirport || '').toLowerCase()
        const arr = (ac.arrival   || route?.estArrivalAirport   || '').toLowerCase()
        const depName = dep ? getAirportName(dep.toUpperCase()).toLowerCase() : ''
        const arrName = arr ? getAirportName(arr.toUpperCase()).toLowerCase() : ''
        return (
          ac.callsign?.toLowerCase().includes(q) ||
          ac.icao24.toLowerCase().includes(q) ||
          dep.includes(q) || arr.includes(q) ||
          depName.includes(q) || arrName.includes(q)
        )
      }).slice(0, 8)
    : []

  // Dashboard KPI calculations
  const inFlightCount = aircraft.filter(ac => !ac.onGround).length
  const onGroundCount = aircraft.filter(ac => ac.onGround).length
  const countryCount = new Set(aircraft.map(ac => ac.originCountry)).size
  const airportFreq: Record<string, number> = {}
  for (const ac of aircraft) {
    if (ac.departure) airportFreq[ac.departure] = (airportFreq[ac.departure] ?? 0) + 1
    if (ac.arrival) airportFreq[ac.arrival] = (airportFreq[ac.arrival] ?? 0) + 1
  }
  const busiestAirport = Object.entries(airportFreq).sort((a, b) => b[1] - a[1])[0]
  const highestAlt = aircraft.reduce<AircraftState | null>((best, ac) => {
    if (ac.baroAltitude === null) return best
    if (!best || best.baroAltitude === null || ac.baroAltitude > best.baroAltitude) return ac
    return best
  }, null)
  const fastestAc = aircraft.reduce<AircraftState | null>((best, ac) => {
    if (ac.velocity === null) return best
    if (!best || best.velocity === null || ac.velocity > best.velocity) return ac
    return best
  }, null)
  // Most delayed airline from irops
  const airlineDelays: Record<string, number[]> = {}
  for (const f of iropsFlights) {
    if (f.airline && (f as any).delay != null) {
      if (!airlineDelays[f.airline]) airlineDelays[f.airline] = []
      airlineDelays[f.airline].push((f as any).delay)
    }
  }
  const mostDelayed = Object.entries(airlineDelays)
    .map(([name, delays]) => ({ name, avg: delays.reduce((a, b) => a + b, 0) / delays.length }))
    .sort((a, b) => b.avg - a.avg)[0]

  const bgColor = darkMode ? '#0a0f1e' : '#f1f5f9'
  const headerBg = darkMode ? '#080d1a' : '#e2e8f0'
  const textPrimary = darkMode ? 'text-white' : 'text-slate-900'
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600'

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${darkMode ? '' : 'light-mode'}`} style={{ background: bgColor }}>
      {/* Emergency squawk banner */}
      {emergencyAircraft.length > 0 && (
        <div className="animate-pulse flex items-center gap-3 px-4 py-2 z-[5000]" style={{ background: '#ff0000', color: '#fff' }}>
          <span className="text-xs font-black uppercase tracking-widest">🚨 EMERGENCY SQUAWK</span>
          {emergencyAircraft.map(e => (
            <span key={e.icao24} className="text-xs font-bold font-mono border border-white/40 px-2 py-0.5 rounded">
              {e.callsign} · {e.squawk} · {EMERGENCY_SQUAWKS[e.squawk]?.label}
            </span>
          ))}
        </div>
      )}

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-1 pointer-events-none">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-md shadow-xl animate-pulse"
              style={{ background: `${alert.color}18`, borderColor: `${alert.color}60`, color: alert.color }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <span className="text-xs font-bold font-mono uppercase tracking-wider">
                {alert.callsign} — {alert.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 border-b border-cyan-accent/20 gap-2" style={{ background: headerBg }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-6 h-6 text-cyan-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <div>
            <h1 className={`text-sm sm:text-base font-bold tracking-wider glow-text leading-none ${textPrimary}`}>ATC MONITOR</h1>
            <p className="hidden sm:block text-[9px] text-cyan-accent/60 tracking-widest uppercase">Live Air Traffic Control</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-shrink-0 overflow-x-auto max-w-full">
          {(['map', 'dashboard', 'status', 'irops', 'routes', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-cyan-accent text-navy font-bold'
                  : `${textSecondary} hover:text-slate-200 hover:bg-white/5`
              }`}
            >
              {tab === 'map' ? 'Live Map' : tab === 'status' ? 'Flight Status' : tab === 'irops' ? 'IROPs' : tab === 'routes' ? 'Routes' : tab === 'stats' ? 'Stats' : 'Dashboard'}
            </button>
          ))}
        </nav>

        {/* Search bar */}
        <div ref={searchRef} className="relative order-last w-full md:order-none md:flex-1 md:max-w-xs">
          <input
            type="text"
            placeholder="Search callsign, ICAO, airport…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/40"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[3000] rounded-lg border border-white/10 overflow-hidden max-h-[70vh] overflow-y-auto" style={{ background: '#0d1526' }}>
              {searchResults.map(ac => (
                <button
                  key={ac.icao24}
                  onClick={() => {
                    setSelectedAircraft(ac)
                    setActiveTab('map')
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className="text-xs font-bold font-mono text-cyan-400">{ac.callsign?.trim() || ac.icao24.toUpperCase()}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-500">{ac.icao24.toUpperCase()} · {ac.originCountry}</span>
                    {(() => {
                      const route = routeMap[ac.icao24.toLowerCase()]
                      const dep = ac.departure || route?.estDepartureAirport
                      const arr = ac.arrival   || route?.estArrivalAirport
                      return (dep || arr) ? (
                        <span className="text-[10px] text-amber-400/80 font-mono">
                          {dep || '???'} → {arr || '???'}
                          {dep && <span className="text-slate-600 ml-1">({getAirportNameSafe(dep)})</span>}
                        </span>
                      ) : null
                    })()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Dark/light mode toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="px-2 py-1 rounded border border-white/10 text-slate-500 hover:text-slate-300 text-xs transition-all"
          >
            {darkMode ? '☀' : '🌙'}
          </button>

          {/* Alert rules */}
          <button
            onClick={() => setShowAlertRules(true)}
            title="Alert rules"
            className="px-2 py-1 rounded border border-white/10 text-slate-500 hover:text-amber-400 hover:border-amber-400/30 text-xs transition-all"
          >
            ⚙ Rules
          </button>

          {/* Log toggle with badge */}
          <button
            onClick={() => { setShowLog(s => !s); setUnreadCount(0) }}
            title="Toggle flight log"
            className={`relative px-2 py-1 rounded border text-xs transition-all ${showLog ? 'border-cyan-accent/40 text-cyan-accent' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}
          >
            📋 Log
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Fullscreen button */}
          <button
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="px-2 py-1 rounded border border-white/10 text-slate-500 hover:text-slate-300 text-xs transition-all"
          >
            {isFullscreen ? '✕ Exit Full' : '⛶'}
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}
            className={`p-1.5 rounded border transition-all ${soundEnabled ? 'border-cyan-accent/40 text-cyan-accent' : 'border-white/10 text-slate-500'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {soundEnabled
                ? <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></>
                : <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              }
            </svg>
          </button>

          <RefreshTimer
            intervalSeconds={60}
            lastRefresh={dataUpdatedAt ? dataUpdatedAt / 1000 : 0}
            onManualRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </div>
      </header>

      {isMock && !isLoading && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold text-amber-300 border-b border-amber-400/30" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
          <span className="flex-shrink-0">⚠️ DEMO DATA</span>
          <span className="font-normal text-amber-300/80 truncate">Live feed didn't load — showing sample flights. Try a hard refresh.</span>
        </div>
      )}

      <StatsBar aircraft={aircraft} lastUpdated={dataUpdatedAt ? dataUpdatedAt / 1000 : null} />

      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'map' && (
          <div className="flex flex-col h-full">
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 min-w-0 relative">
                <FlightMap
                  aircraft={aircraft}
                  selectedAircraft={selectedAircraft}
                  onSelectAircraft={setSelectedAircraft}
                  iropsFlights={iropsFlights}
                  routeMap={routeMap}
                  conflicts={conflicts}
                  emergencyIcaos={new Set(emergencyAircraft.map(e => e.icao24))}
                />
                {positionHistory.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">History</span>
                    <input
                      type="range"
                      min={0}
                      max={positionHistory.length - 1}
                      value={historyIdx ?? positionHistory.length - 1}
                      onChange={e => {
                        const idx = parseInt(e.target.value)
                        setHistoryIdx(idx === positionHistory.length - 1 ? null : idx)
                      }}
                      className="w-40 accent-cyan-400"
                    />
                    <span className="text-[10px] text-slate-400 font-mono w-20">
                      {historyIdx !== null
                        ? new Date(positionHistory[historyIdx].ts).toLocaleTimeString('en-US', { hour12: false })
                        : 'LIVE'}
                    </span>
                    {historyIdx !== null && (
                      <button
                        onClick={() => setHistoryIdx(null)}
                        className="text-[10px] font-bold text-cyan-400 border border-cyan-accent/40 px-2 py-0.5 rounded hover:bg-cyan-accent/10 transition-all"
                      >
                        LIVE
                      </button>
                    )}
                    {historyIdx !== null && (
                      <span className="text-[10px] text-slate-600 font-mono">
                        {Object.keys(positionHistory[historyIdx].positions).length} ac
                      </span>
                    )}
                  </div>
                )}
              </div>
              {selectedAircraft && (
                <div className="fixed inset-0 z-[4500] md:static md:inset-auto md:z-auto w-full md:w-72 flex-shrink-0">
                  <AircraftDetail
                    aircraft={selectedAircraft}
                    onClose={() => setSelectedAircraft(null)}
                    isFavorite={favorites.has(selectedAircraft.icao24)}
                    onToggleFavorite={handleToggleFavorite}
                    note={notes[selectedAircraft.icao24] || ''}
                    onSaveNote={handleSaveNote}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardOverview
            aircraft={aircraft}
            inFlightCount={inFlightCount}
            onGroundCount={onGroundCount}
            countryCount={countryCount}
            busiestAirport={busiestAirport}
            highestAlt={highestAlt}
            fastestAc={fastestAc}
            mostDelayed={mostDelayed}
          />
        )}

        {activeTab === 'status' && <FlightStatusPage />}

        {activeTab === 'irops' && <IrregularOps />}

        {activeTab === 'routes' && <RouteGuide />}

        {activeTab === 'stats' && <StatsDashboard aircraft={aircraft} />}

        {showLog && (
          <div className="fixed bottom-0 right-0 w-full sm:w-72 z-[4000] flex flex-col shadow-2xl" style={{ height: '50vh', background: '#080d1a', borderLeft: '1px solid rgba(6,182,212,0.2)', borderTop: '1px solid rgba(6,182,212,0.2)' }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-accent/20">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Flight Log</span>
              <button onClick={() => setShowLog(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FlightLog events={log} />
            </div>
          </div>
        )}
      </main>

      {showAlertRules && (
        <AlertRulesModal onClose={() => setShowAlertRules(false)} aircraft={aircraft} onLog={addLog} />
      )}

    </div>
  )
}

function FlightStatusModal({ flightNumber, onClose }: { flightNumber: string; onClose: () => void }) {
  // Date options: today ±10 days. Empty string = "today/nearest" (no date param).
  const today = new Date()
  const dateOptions = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + (i - 10))
    return d.toISOString().slice(0, 10)
  })
  const todayStr = today.toISOString().slice(0, 10)
  const [date, setDate] = useState(todayStr)
  const [myTime, setMyTime] = useState(false)
  const apiDate = date === todayStr ? undefined : date
  const { data: flight, isLoading } = useFlightInfo(flightNumber, apiDate)
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const fmt = (iso?: string | null) => {
    if (!iso) return null
    if (myTime) {
      const d = new Date(iso.replace(' ', 'T'))
      if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    const m = iso.match(/[ T](\d{2}:\d{2})/)
    const tz = tzOffsetLabel(iso)
    return m ? `${m[1]}${tz ? ` ${tz}` : ''}` : iso
  }
  // Delay in minutes from two offset-bearing ISO strings (null if not computable).
  const delayMins = (sched?: string | null, actual?: string | null) => {
    if (!sched || !actual) return null
    const d = (new Date(actual.replace(' ', 'T')).getTime() - new Date(sched.replace(' ', 'T')).getTime()) / 60000
    return Number.isNaN(d) ? null : Math.round(d)
  }
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-cyan-accent/30 overflow-hidden" style={{ background: '#0d1526' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-bold font-mono text-cyan-400">Flight Status · {flightNumber}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
          <select
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-accent/40"
            style={{ background: '#0d1526' }}
          >
            {dateOptions.map(d => (
              <option key={d} value={d} style={{ background: '#0d1526' }}>
                {d === todayStr ? `Today (${d})` : d}
              </option>
            ))}
          </select>
          <button
            onClick={() => setMyTime(m => !m)}
            title={`Toggle between airport-local time and your time (${myTz})`}
            className={`ml-auto text-[10px] px-2 py-1 rounded border transition-all ${myTime ? 'border-cyan-accent/50 text-cyan-300 bg-cyan-accent/10' : 'border-white/10 text-slate-400'}`}
          >
            {myTime ? '🕒 My time' : '🕒 Airport time'}
          </button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center text-xs text-slate-500 py-8">Looking up flight…</div>
          ) : !flight ? (
            <div className="text-center text-xs text-slate-500 py-8">
              No schedule found for <span className="font-mono text-slate-300">{flightNumber}</span>.<br />
              <span className="text-slate-600">It may not operate today, or the number isn't a scheduled flight.</span>
            </div>
          ) : (
            (() => {
            const cancelled = /cancel/i.test(flight.status || '')
            const depDelay = delayMins(flight.departure.scheduled, flight.departure.actual)
            const arrDelay = delayMins(flight.arrival.scheduled, flight.arrival.actual)
            const worstDelay = Math.max(depDelay ?? -999, arrDelay ?? -999)
            const isDelayed = !cancelled && worstDelay > 15
            const badge = cancelled
              ? { text: 'CANCELLED', cls: 'border-red-500/50 text-red-400 bg-red-500/10' }
              : isDelayed
              ? { text: `DELAYED +${worstDelay}m`, cls: 'border-amber-400/50 text-amber-400 bg-amber-400/10' }
              : { text: flight.status || 'SCHEDULED', cls: 'border-cyan-accent/40 text-cyan-300' }
            // Only treat a revised time as meaningful when it's genuinely later.
            const depActual = depDelay !== null && depDelay > 5 ? flight.departure.actual : null
            const arrActual = arrDelay !== null && arrDelay > 5 ? flight.arrival.actual : null
            return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">{flight.airline || '—'}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badge.cls}`}>{badge.text}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-2xl font-black font-mono text-white">{flight.departure.airport || '—'}</div>
                  <div className="text-[9px] text-slate-500 max-w-[110px] truncate">{flight.departure.name || ''}</div>
                </div>
                <div className="text-cyan-accent text-xl px-2">✈</div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-white">{flight.arrival.airport || '—'}</div>
                  <div className="text-[9px] text-slate-500 max-w-[110px] truncate ml-auto">{flight.arrival.name || ''}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-black/20 rounded p-2">
                  <div className="text-slate-500 uppercase tracking-wider mb-1">Departure</div>
                  <div className="text-slate-300">Sched: <span className="text-white">{fmt(flight.departure.scheduled) || '—'}</span></div>
                  {depActual && <div className="text-amber-300">Actual: {fmt(depActual)} <span className="text-red-400">+{depDelay}m</span></div>}
                  <div className="text-slate-500 mt-1">Term {flight.departure.terminal || '—'} · Gate {flight.departure.gate || '—'}</div>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <div className="text-slate-500 uppercase tracking-wider mb-1">Arrival</div>
                  <div className="text-slate-300">Sched: <span className="text-white">{fmt(flight.arrival.scheduled) || '—'}</span></div>
                  {arrActual && <div className="text-amber-300">ETA: {fmt(arrActual)} <span className="text-red-400">+{arrDelay}m</span></div>}
                  <div className="text-slate-500 mt-1">Term {flight.arrival.terminal || '—'} · Gate {flight.arrival.gate || '—'}</div>
                </div>
              </div>
              <div className="text-[9px] text-slate-600">{myTime ? `Your time · ${myTz}` : 'Local airport time'} (DST auto-applied). Source: AeroDataBox.</div>
            </div>
            )
            })()
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardOverview({
  aircraft, inFlightCount, onGroundCount, countryCount,
  busiestAirport, highestAlt, fastestAc, mostDelayed
}: {
  aircraft: AircraftState[]
  inFlightCount: number
  onGroundCount: number
  countryCount: number
  busiestAirport?: [string, number]
  highestAlt: AircraftState | null
  fastestAc: AircraftState | null
  mostDelayed?: { name: string; avg: number }
}) {
  const kpis = [
    { label: 'Total Flights', value: aircraft.length.toLocaleString(), color: '#00d4ff' },
    { label: 'In Flight', value: inFlightCount.toLocaleString(), color: '#22c55e' },
    { label: 'On Ground', value: onGroundCount.toLocaleString(), color: '#64748b' },
    { label: 'Countries', value: countryCount.toLocaleString(), color: '#a78bfa' },
    { label: 'Busiest Airport', value: busiestAirport ? `${busiestAirport[0]} (${busiestAirport[1]})` : '—', color: '#f59e0b' },
    {
      label: 'Highest Flight',
      value: highestAlt ? `${highestAlt.callsign?.trim() || highestAlt.icao24.toUpperCase()} · ${Math.round((highestAlt.baroAltitude ?? 0) * 3.28084).toLocaleString()} ft` : '—',
      color: '#00d4ff',
    },
    {
      label: 'Fastest Flight',
      value: fastestAc ? `${toIataCallsign(fastestAc.callsign) || fastestAc.icao24.toUpperCase()} · ${Math.round((fastestAc.velocity ?? 0) * 1.944)} kts` : '—',
      color: '#22c55e',
    },
    {
      label: 'Most Delayed Airline',
      value: mostDelayed ? `${mostDelayed.name} (~${Math.round(mostDelayed.avg)} min)` : '—',
      color: '#ef4444',
    },
  ]

  return (
    <div className="h-full overflow-auto p-6 space-y-6" style={{ background: '#0a0f1e' }}>
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-bold text-white tracking-wider">Dashboard Overview</h2>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="rounded-xl border p-4 flex flex-col gap-1"
            style={{ background: '#0d1526', borderColor: `${kpi.color}30` }}
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">{kpi.label}</div>
            <div className="text-base font-bold font-mono leading-tight" style={{ color: kpi.color, textShadow: `0 0 10px ${kpi.color}55` }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface AircraftDetailProps {
  aircraft: AircraftState
  onClose: () => void
  isFavorite?: boolean
  onToggleFavorite?: (icao: string) => void
  note?: string
  onSaveNote?: (icao: string, text: string) => void
}

function AircraftDetail({ aircraft, onClose, isFavorite, onToggleFavorite, note = '', onSaveNote }: AircraftDetailProps) {
  const [copied, setCopied] = useState(false)
  const [noteText, setNoteText] = useState(note)
  const { data: photoUrl } = useAircraftPhoto(aircraft.icao24)
  const { data: flightInfo, isLoading: flightInfoLoading } = useFlightInfo(aircraft.callsign)

  useEffect(() => { setNoteText(note) }, [aircraft.icao24, note])

  const fmtAlt = (m: number | null) => m !== null ? `${Math.round(m * 3.28084).toLocaleString()} ft` : 'N/A'
  const fmtSpd = (ms: number | null) => ms !== null ? `${Math.round(ms * 1.944)} kts` : 'N/A'
  const fmtVr  = (ms: number | null) => ms !== null ? `${ms > 0 ? '+' : ''}${ms.toFixed(1)} m/s` : 'N/A'
  const fmtSched = (iso: string) => {
    // AeroDataBox local time e.g. "2026-06-23 17:40+02:00" — offset already
    // reflects DST for that date, so just present date + time + offset.
    const m = iso.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
    if (!m) return iso
    const tz = tzOffsetLabel(iso)
    return `${m[1].slice(5)} ${m[2]}${tz ? ` ${tz}` : ''}`
  }

  const ft = aircraft.baroAltitude !== null ? aircraft.baroAltitude * 3.28084 : 0
  const kts = aircraft.velocity !== null ? Math.round(aircraft.velocity * 1.944) : 0
  const heading = aircraft.trueTrack ?? 0

  const band = (() => {
    if (aircraft.baroAltitude === null) return { label: 'Unknown', color: '#64748b' }
    if (ft < 5000)  return { label: 'Low Altitude', color: '#22c55e' }
    if (ft < 20000) return { label: 'Mid Altitude', color: '#f59e0b' }
    if (ft < 35000) return { label: 'Cruise', color: '#00d4ff' }
    return { label: 'High Cruise', color: '#a78bfa' }
  })()

  const speedPct = Math.min((kts / 600) * 100, 100)
  const altPct = Math.min((ft / 45000) * 100, 100)
  const vr = aircraft.verticalRate ?? 0
  const vrPct = Math.min(Math.abs(vr) / 20, 1) * 50

  let etaText: string | null = null
  if (aircraft.arrival && aircraft.velocity && aircraft.velocity > 0 && aircraft.latitude !== null && aircraft.longitude !== null) {
    const arrCoords = getAirportCoords(aircraft.arrival)
    if (arrCoords) {
      const distKm = haversineKm(aircraft.latitude, aircraft.longitude, arrCoords[0], arrCoords[1])
      const hours = distKm / (aircraft.velocity * 3.6)
      const mins = Math.round(hours * 60)
      etaText = mins > 0 ? `~${mins} min` : 'Arriving'
    }
  }

  const nearbyAirports = (() => {
    if (aircraft.latitude === null || aircraft.longitude === null) return []
    return Object.values(AIRPORTS_BY_IATA)
      .map(ap => ({
        code: ap.iata, name: ap.name,
        distNm: haversineKm(aircraft.latitude!, aircraft.longitude!, ap.lat, ap.lon) * 0.539957,
      }))
      .sort((a, b) => a.distNm - b.distNm)
      .slice(0, 3)
  })()

  const handleShare = () => {
    const url = window.location.origin + '/#' + aircraft.icao24
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="h-full overflow-auto border-l border-cyan-accent/20 flex flex-col" style={{ background: '#080d1a' }}>
      <div className="px-4 pt-4 pb-3 border-b border-white/5" style={{ background: '#0d1526' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xl font-bold font-mono text-cyan-accent" style={{ textShadow: '0 0 12px #00d4ff88' }}>
              {flightInfo?.number?.replace(/\s+/g, '') || toIataCallsign(aircraft.callsign) || aircraft.icao24.toUpperCase()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{aircraft.icao24.toUpperCase()} · {aircraft.originCountry}</div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(aircraft.icao24)}
                title="Toggle favorite"
                className={`text-lg transition-colors px-1 ${isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
              >★</button>
            )}
            <button
              onClick={handleShare}
              title="Copy share link"
              className="text-slate-500 hover:text-cyan-400 transition-colors text-xs px-1.5 py-0.5 rounded border border-white/10 hover:border-cyan-accent/30"
            >
              {copied ? 'Copied!' : '🔗'}
            </button>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
            aircraft.onGround ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-green-500/10 text-green-400 border-green-500/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${aircraft.onGround ? 'bg-slate-400' : 'bg-green-400 animate-pulse'}`} />
            {aircraft.onGround ? 'On Ground' : 'In Flight'}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border"
            style={{ background: `${band.color}15`, color: band.color, borderColor: `${band.color}40` }}>
            {band.label}
          </span>
          {etaText && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border bg-purple-500/10 text-purple-300 border-purple-500/30">
              ETA {etaText}
            </span>
          )}
          {aircraft.squawk && EMERGENCY_SQUAWKS[aircraft.squawk] && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
              🚨 {aircraft.squawk} {EMERGENCY_SQUAWKS[aircraft.squawk].label}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Real schedule via AeroDataBox */}
        {flightInfoLoading && (
          <div className="rounded-xl border border-white/10 p-3 text-center text-[11px] text-slate-500" style={{ background: '#0d1526' }}>
            Looking up flight schedule…
          </div>
        )}
        {!flightInfoLoading && !flightInfo && aircraft.callsign && !aircraft.departure && (
          <div className="rounded-xl border border-white/10 p-3 text-[10px] text-slate-500 leading-snug" style={{ background: '#0d1526' }}>
            Route unavailable — this aircraft's radio callsign ({toIataCallsign(aircraft.callsign)}) doesn't map to a scheduled flight number.
          </div>
        )}
        {flightInfo && (
          <div className="rounded-xl border border-cyan-accent/20 overflow-hidden" style={{ background: '#0d1526' }}>
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Flight Schedule</span>
              {flightInfo.status && (
                <span className="text-[9px] font-mono text-slate-400 uppercase">{flightInfo.status}</span>
              )}
            </div>
            <div className="p-3">
              {flightInfo.airline && <div className="text-[11px] text-slate-300 mb-2">{flightInfo.airline}</div>}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-lg font-bold font-mono text-white">{flightInfo.departure.airport || '—'}</div>
                  <div className="text-[9px] text-slate-500 truncate max-w-[90px]">{flightInfo.departure.name || ''}</div>
                  {flightInfo.departure.scheduled && (
                    <div className="text-[10px] font-mono text-cyan-300 mt-1">{fmtSched(flightInfo.departure.scheduled)}</div>
                  )}
                </div>
                <div className="text-cyan-accent text-lg px-2">✈</div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-white">{flightInfo.arrival.airport || '—'}</div>
                  <div className="text-[9px] text-slate-500 truncate max-w-[90px] ml-auto">{flightInfo.arrival.name || ''}</div>
                  {flightInfo.arrival.scheduled && (
                    <div className="text-[10px] font-mono text-cyan-300 mt-1">{fmtSched(flightInfo.arrival.scheduled)}</div>
                  )}
                </div>
              </div>
              {(flightInfo.arrival.terminal || flightInfo.arrival.gate) && (
                <div className="text-[9px] text-slate-500 font-mono mt-2 text-right">
                  Arr {flightInfo.arrival.terminal ? `T${flightInfo.arrival.terminal}` : ''} {flightInfo.arrival.gate ? `Gate ${flightInfo.arrival.gate}` : ''}
                </div>
              )}
            </div>
          </div>
        )}
        {photoUrl ? (
          <div className="rounded-xl overflow-hidden border border-white/10">
            <img src={photoUrl} alt={aircraft.callsign || aircraft.icao24} className="w-full object-cover" style={{ maxHeight: 140 }} />
            <div className="px-2 py-1 text-[9px] text-slate-600 font-mono text-center" style={{ background: '#0a0f1e' }}>
              Photo via Planespotters.net
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-cyan-accent/20 p-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #0d1a2e 0%, #0a1220 100%)' }}>
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, #00d4ff15 0%, transparent 70%)', border: '1px solid #00d4ff20' }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="#00d4ff" style={{ filter: 'drop-shadow(0 0 6px #00d4ff88)' }}>
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600">ICAO24</span>
                <span className="font-mono text-slate-300">{aircraft.icao24.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600">Country</span>
                <span className="font-mono text-slate-300">{aircraft.originCountry}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600">Status</span>
                <span className={`font-mono font-bold ${aircraft.onGround ? 'text-slate-400' : 'text-green-400'}`}>
                  {aircraft.onGround ? 'On Ground' : 'In Flight'}
                </span>
              </div>
              {aircraft.squawk && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-600">Squawk</span>
                  <span className={`font-mono font-bold ${EMERGENCY_SQUAWKS[aircraft.squawk] ? 'text-red-400' : 'text-amber-400'}`}>{aircraft.squawk}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(aircraft.departure || aircraft.arrival) && (
          <div className="rounded-xl border border-cyan-accent/20 overflow-hidden" style={{ background: '#0d1a2e' }}>
            <div className="flex items-stretch">
              <div className="flex-1 p-3 text-center border-r border-white/5">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">From</div>
                <div className="text-2xl font-black font-mono text-white">{aircraft.departure || '???'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{getAirportNameSafe(aircraft.departure) || '—'}</div>
              </div>
              <div className="flex flex-col items-center justify-center px-3 gap-1">
                <svg className="w-5 h-5 text-cyan-accent/60" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div className="text-[8px] text-slate-600 font-mono uppercase tracking-widest">enroute</div>
              </div>
              <div className="flex-1 p-3 text-center border-l border-white/5">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">To</div>
                <div className="text-2xl font-black font-mono text-white">{aircraft.arrival || '???'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{getAirportNameSafe(aircraft.arrival) || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {aircraft.departure && aircraft.arrival && aircraft.latitude !== null && aircraft.longitude !== null && (() => {
          const depCoords = getAirportCoords(aircraft.departure)
          const arrCoords = getAirportCoords(aircraft.arrival)
          if (!depCoords || !arrCoords) return null
          const totalDist = haversineKm(depCoords[0], depCoords[1], arrCoords[0], arrCoords[1])
          const remainDist = haversineKm(aircraft.latitude, aircraft.longitude, arrCoords[0], arrCoords[1])
          const traveledDist = Math.max(0, totalDist - remainDist)
          const pct = totalDist > 0 ? Math.min(Math.round((traveledDist / totalDist) * 100), 100) : 0
          const isDelayed = aircraft.verticalRate !== null && aircraft.velocity !== null && aircraft.velocity < 150
          return (
            <div className="rounded-xl border border-white/10 p-3" style={{ background: '#0d1526' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest">Flight Progress</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-white">{pct}%</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isDelayed ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : 'text-green-400 border-green-400/30 bg-green-400/10'
                  }`}>
                    {isDelayed ? 'DELAYED' : 'ON SCHED'}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #00d4ff)' }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
                <span>{aircraft.departure}</span>
                <span>{Math.round(remainDist)} km left</span>
                <span>{aircraft.arrival}</span>
              </div>
            </div>
          )
        })()}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 p-3 flex flex-col items-center" style={{ background: '#0d1526' }}>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Heading</div>
            <svg viewBox="0 0 80 80" className="w-16 h-16">
              <circle cx="40" cy="40" r="36" fill="#0a0f1e" stroke="#1e3a4a" strokeWidth="2"/>
              <circle cx="40" cy="40" r="33" fill="none" stroke="#0d2035" strokeWidth="1"/>
              {[0,90,180,270].map(deg => {
                const r = (deg * Math.PI) / 180
                return <line key={deg} x1={40 + 28 * Math.sin(r)} y1={40 - 28 * Math.cos(r)} x2={40 + 33 * Math.sin(r)} y2={40 - 33 * Math.cos(r)} stroke="#00d4ff" strokeWidth="1.5"/>
              })}
              {Array.from({length: 36}, (_, i) => i * 10).filter(d => d % 90 !== 0).map(deg => {
                const r = (deg * Math.PI) / 180
                return <line key={deg} x1={40 + 30 * Math.sin(r)} y1={40 - 30 * Math.cos(r)} x2={40 + 33 * Math.sin(r)} y2={40 - 33 * Math.cos(r)} stroke="#1e3a4a" strokeWidth="1"/>
              })}
              <text x="40" y="12" textAnchor="middle" fill="#00d4ff" fontSize="7" fontFamily="monospace" fontWeight="bold">N</text>
              <g transform={`rotate(${heading}, 40, 40)`}>
                <polygon points="40,10 37,40 40,46 43,40" fill="#00d4ff" opacity="0.9"/>
                <polygon points="40,70 37,40 40,46 43,40" fill="#ff4444" opacity="0.7"/>
              </g>
              <circle cx="40" cy="40" r="3" fill="#00d4ff"/>
            </svg>
            <div className="text-sm font-bold font-mono text-white mt-1">{Math.round(heading)}°</div>
          </div>

          <div className="rounded-xl border border-white/10 p-3 flex flex-col items-center" style={{ background: '#0d1526' }}>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Vert Rate</div>
            <div className="relative flex items-center justify-center w-16 h-16">
              <svg viewBox="0 0 80 80" className="w-16 h-16">
                <circle cx="40" cy="40" r="36" fill="#0a0f1e" stroke="#1e3a4a" strokeWidth="2"/>
                <line x1="40" y1="12" x2="40" y2="68" stroke="#1e3a4a" strokeWidth="1"/>
                <line x1="12" y1="40" x2="68" y2="40" stroke="#1e3a4a" strokeWidth="0.5"/>
                {vr !== 0 && (
                  <rect
                    x="36" y={vr > 0 ? 40 - vrPct * 0.56 * 40 : 40}
                    width="8" height={Math.abs(vrPct) * 0.56}
                    fill={vr > 0 ? '#22c55e' : '#ef4444'} opacity="0.8" rx="2"
                  />
                )}
                {vr > 0
                  ? <polygon points="40,14 36,22 44,22" fill="#22c55e"/>
                  : vr < 0
                  ? <polygon points="40,66 36,58 44,58" fill="#ef4444"/>
                  : <circle cx="40" cy="40" r="4" fill="#64748b"/>
                }
              </svg>
            </div>
            <div className={`text-sm font-bold font-mono mt-1 ${vr > 0 ? 'text-green-400' : vr < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {fmtVr(aircraft.verticalRate)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-3" style={{ background: '#0d1526' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Airspeed</span>
            <span className="text-sm font-bold font-mono text-white">{fmtSpd(aircraft.velocity)}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${speedPct}%`, background: 'linear-gradient(90deg, #00d4ff, #0099cc)' }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
            <span>0</span><span>300 kts</span><span>600 kts</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-3" style={{ background: '#0d1526' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Altitude</span>
            <span className="text-sm font-bold font-mono text-white">{fmtAlt(aircraft.baroAltitude)}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${altPct}%`, background: `linear-gradient(90deg, #22c55e, ${band.color})` }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
            <span>GND</span><span>FL150</span><span>FL450</span>
          </div>
        </div>

        {nearbyAirports.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
            <div className="px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-semibold">Nearby Airports</span>
            </div>
            {nearbyAirports.map(ap => (
              <div key={ap.code} className="flex justify-between items-center px-3 py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-xs font-bold font-mono text-white">{ap.code}</span>
                  <span className="text-[10px] text-slate-500 ml-2">{ap.name}</span>
                </div>
                <span className="text-xs text-slate-300 font-mono">{Math.round(ap.distNm)} nm</span>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
          {[
            { label: 'ICAO24',    value: aircraft.icao24.toUpperCase() },
            { label: 'Squawk',    value: aircraft.squawk || '—' },
            { label: 'Latitude',  value: aircraft.latitude  !== null ? aircraft.latitude.toFixed(4)  + '°' : 'N/A' },
            { label: 'Longitude', value: aircraft.longitude !== null ? aircraft.longitude.toFixed(4) + '°' : 'N/A' },
            { label: 'Geo Alt',   value: fmtAlt(aircraft.geoAltitude) },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between items-center px-3 py-2 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</span>
              <span className="text-xs text-slate-200 font-mono">{value}</span>
            </div>
          ))}
        </div>

        {/* Flight Notes */}
        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
            <span className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-semibold">📝 Notes</span>
          </div>
          <div className="p-3">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onBlur={() => onSaveNote && onSaveNote(aircraft.icao24, noteText)}
              placeholder="Add notes for this flight…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-cyan-accent/40 resize-none font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ComparePanel({ aircraft, routeMap, onRemove }: { aircraft: AircraftState[]; routeMap: Record<string, any>; onRemove: (icao: string) => void }) {
  return (
    <div className="border-t border-cyan-accent/20 overflow-auto" style={{ background: '#080d1a', maxHeight: 220 }}>
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
        <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Compare Aircraft ({aircraft.length}/3)</span>
        <span className="text-[10px] text-slate-600">Select up to 3 in table above</span>
      </div>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto">
        {aircraft.map(ac => {
          const kts = ac.velocity ? Math.round(ac.velocity * 1.944) : 0
          const ft = ac.baroAltitude ? Math.round(ac.baroAltitude * 3.28084) : 0
          const vr = ac.verticalRate ?? 0
          const route = routeMap[ac.icao24.toLowerCase()]
          const dep = ac.departure || route?.estDepartureAirport
          const arr = ac.arrival || route?.estArrivalAirport
          return (
            <div key={ac.icao24} className="flex-shrink-0 w-44 rounded-xl border border-cyan-accent/20 overflow-hidden" style={{ background: '#0d1526' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5" style={{ background: '#0a1628' }}>
                <span className="text-xs font-bold font-mono text-cyan-400">{ac.callsign?.trim() || ac.icao24.toUpperCase()}</span>
                <button onClick={() => onRemove(ac.icao24)} className="text-slate-600 hover:text-white text-xs">✕</button>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-600">Speed</span>
                  <span className="font-mono text-white">{kts} kts</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-600">Altitude</span>
                  <span className="font-mono text-white">{ft.toLocaleString()} ft</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-600">Vert rate</span>
                  <span className={`font-mono font-bold ${vr > 0 ? 'text-green-400' : vr < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {vr > 0 ? '+' : ''}{vr.toFixed(1)} m/s
                  </span>
                </div>
                {(dep || arr) && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-600">Route</span>
                    <span className="font-mono text-amber-400">{dep || '?'}→{arr || '?'}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getAirportNameSafe(code: string | undefined): string {
  if (!code) return ''
  const name = getAirportName(code)
  return name !== code ? name : ''
}
