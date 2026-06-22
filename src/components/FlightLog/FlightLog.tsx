import React from 'react'

export interface LogEvent {
  id: number
  time: string
  type: 'info' | 'warning' | 'alert'
  message: string
}

interface Props {
  events: LogEvent[]
}

const TYPE_COLOR: Record<LogEvent['type'], string> = {
  info: '#06b6d4',
  warning: '#f59e0b',
  alert: '#ef4444',
}

export function FlightLog({ events }: Props) {
  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto', background: '#080d1a', borderLeft: '1px solid rgba(6,182,212,0.15)' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 10, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
          Flight Log
        </span>
      </div>
      {events.length === 0 && (
        <div style={{ padding: '12px', fontSize: 11, color: '#475569', fontFamily: 'monospace', textAlign: 'center' }}>
          No events yet
        </div>
      )}
      {[...events].reverse().map(ev => (
        <div
          key={ev.id}
          style={{
            display: 'flex',
            gap: 8,
            padding: '6px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            background: ev.type === 'alert' ? 'rgba(239,68,68,0.05)' : ev.type === 'warning' ? 'rgba(245,158,11,0.05)' : 'transparent',
          }}
        >
          <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', flexShrink: 0, paddingTop: 1 }}>{ev.time}</span>
          <div
            style={{
              width: 3,
              borderRadius: 2,
              flexShrink: 0,
              background: TYPE_COLOR[ev.type],
              alignSelf: 'stretch',
              minHeight: 14,
            }}
          />
          <span style={{ fontSize: 11, color: TYPE_COLOR[ev.type], fontFamily: 'monospace', lineHeight: 1.4 }}>
            {ev.message}
          </span>
        </div>
      ))}
    </div>
  )
}
