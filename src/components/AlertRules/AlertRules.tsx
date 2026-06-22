import React, { useState, useEffect } from 'react'
import { AircraftState } from '../../types/flight'

export interface AlertRule {
  id: string
  field: 'altitude' | 'speed'
  operator: '<' | '>'
  value: number
  enabled: boolean
}

const STORAGE_KEY = 'atc_alert_rules'

function loadRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveRules(rules: AlertRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export function useAlertRules(aircraft: AircraftState[], onLog: (msg: string) => void) {
  const [rules, setRules] = useState<AlertRule[]>(loadRules)
  const firedRef = React.useRef<Set<string>>(new Set())

  useEffect(() => {
    saveRules(rules)
  }, [rules])

  useEffect(() => {
    if (aircraft.length === 0) return
    for (const rule of rules) {
      if (!rule.enabled) continue
      for (const ac of aircraft) {
        if (!ac.callsign || ac.onGround) continue
        const val = rule.field === 'altitude'
          ? (ac.baroAltitude !== null ? ac.baroAltitude * 3.28084 : null)
          : (ac.velocity !== null ? ac.velocity * 1.944 : null)
        if (val === null) continue
        const triggered = rule.operator === '<' ? val < rule.value : val > rule.value
        const key = `${rule.id}-${ac.icao24}`
        if (triggered && !firedRef.current.has(key)) {
          firedRef.current.add(key)
          onLog(`RULE: ${ac.callsign.trim()} ${rule.field} ${rule.operator} ${rule.value}${rule.field === 'altitude' ? 'ft' : 'kts'} (${Math.round(val)})`)
        } else if (!triggered) {
          firedRef.current.delete(key)
        }
      }
    }
  }, [aircraft, rules])

  return { rules, setRules }
}

export function AlertRulesModal({ onClose, aircraft, onLog }: { onClose: () => void; aircraft: AircraftState[]; onLog: (msg: string) => void }) {
  const { rules, setRules } = useAlertRules(aircraft, onLog)
  const [field, setField] = useState<'altitude' | 'speed'>('altitude')
  const [operator, setOperator] = useState<'<' | '>'>('<')
  const [value, setValue] = useState('')

  const addRule = () => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    const newRule: AlertRule = {
      id: Date.now().toString(),
      field,
      operator,
      value: num,
      enabled: true,
    }
    setRules(prev => [...prev, newRule])
    setValue('')
  }

  const deleteRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id))
  const toggleRule = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-96 rounded-xl border border-cyan-accent/30 overflow-hidden shadow-2xl"
        style={{ background: '#0d1526' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Alert Rules</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest">Create Rule</div>
          <div className="flex gap-2 items-center">
            <select
              value={field}
              onChange={e => setField(e.target.value as 'altitude' | 'speed')}
              className="rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
              style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="altitude">Altitude (ft)</option>
              <option value="speed">Speed (kts)</option>
            </select>
            <select
              value={operator}
              onChange={e => setOperator(e.target.value as '<' | '>')}
              className="rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
              style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="<">{'< below'}</option>
              <option value=">">{'> above'}</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Enter value e.g. 5000"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRule()}
              className="flex-1 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-accent/40"
              style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={addRule}
              className="rounded px-4 py-2 text-xs font-bold transition-all whitespace-nowrap"
              style={{ background: '#00d4ff22', border: '1px solid #00d4ff66', color: '#00d4ff' }}
            >
              + Add Rule
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2 max-h-64 overflow-auto">
          {rules.length === 0 && (
            <div className="text-xs text-slate-600 text-center py-4">No rules yet</div>
          )}
          {rules.map(rule => (
            <div key={rule.id} className={`flex items-center gap-2 p-2 rounded-lg border ${rule.enabled ? 'border-cyan-accent/20 bg-cyan-accent/5' : 'border-white/5 bg-white/2 opacity-50'}`}>
              <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full border ${rule.enabled ? 'bg-cyan-400 border-cyan-400' : 'border-white/20'}`} />
              </button>
              <span className="flex-1 text-xs font-mono text-slate-300">
                {rule.field} {rule.operator} {rule.value}{rule.field === 'altitude' ? ' ft' : ' kts'}
              </span>
              <button onClick={() => deleteRule(rule.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
