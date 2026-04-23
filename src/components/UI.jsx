import { useState, useRef, useEffect } from 'react'

const iStyle = {
  padding: '7px 10px', fontSize: 13, borderRadius: 8,
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
  boxSizing: 'border-box', width: '100%',
}

export function Inp({ value, onChange, type = 'text', placeholder, style, min, max, disabled }) {
  return (
    <input
      type={type} value={value ?? ''} placeholder={placeholder}
      min={min} max={max} disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{ ...iStyle, ...style, opacity: disabled ? 0.5 : 1 }}
    />
  )
}

export function Sel({ value, onChange, options, disabled }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ ...iStyle, opacity: disabled ? 0.5 : 1 }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Lbl({ children }) {
  return <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 3 }}>{children}</div>
}

export function Sec({ label, children, style }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 10, padding: '12px 14px', ...style
    }}>
      <div style={{
        fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)',
        letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10
      }}>{label}</div>
      {children}
    </div>
  )
}

export function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: '7px 4px', border: '0.5px solid', cursor: 'pointer',
          fontSize: 12, borderRadius: 8,
          borderColor: value === v ? '#1d9e75' : 'var(--color-border-tertiary)',
          background: value === v ? '#e1f5ee' : 'transparent',
          color: value === v ? '#085041' : 'var(--color-text-primary)',
          fontWeight: value === v ? 500 : 400,
        }}>{l}</button>
      ))}
    </div>
  )
}

export function Combo({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = (options || []).filter(o => o.toLowerCase().includes((value || '').toLowerCase()))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={value || ''} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        style={{ ...iStyle }} />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-secondary)',
          borderRadius: 8, marginTop: 2, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>
          {filtered.map(o => (
            <div key={o}
              onMouseDown={() => { onChange(o); setOpen(false) }}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '0.5px solid var(--color-border-tertiary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{o}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LotGrid({ lots }) {
  if (!lots || !lots.length) return null
  const half = Math.ceil(lots.length / 2)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
      {Array.from({ length: half }, (_, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {[lots[i], lots[i + half]].map((lot, j) => lot ? (
            <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 22, textAlign: 'right' }}>
                {j === 0 ? i + 1 : i + half + 1}.
              </span>
              <span style={{
                fontFamily: 'monospace', fontSize: 11, flex: 1,
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 4, padding: '1px 6px',
              }}>{lot.lot}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                {lot.qty.toLocaleString()} kg
              </span>
            </div>
          ) : <div key={j} />)}
        </div>
      ))}
    </div>
  )
}

export function CertRow({ cert, onView, onSent, onDelete }) {
  const STATUS_COLOR = { saved: '#378add', sent: '#1d9e75', archived: '#888780' }
  const STATUS_LABEL = { saved: 'Zapisany', sent: 'Wysłany', archived: 'Archiwum' }
  const fmtD = d => { if (!d) return ''; const s = d.slice(0,10); const [y,m,day] = s.split('-'); return `${day}.${m}.${y}` }

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 10, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 7,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Nr {cert.certNumber}</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
            background: STATUS_COLOR[cert.status] + '22',
            color: STATUS_COLOR[cert.status],
          }}>{STATUS_LABEL[cert.status]}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cert.buyer} · {cert.productCode} · {(cert.totalKg || 0).toLocaleString()} kg · {cert.pallets} palet · {fmtD(cert.dateLoading)}
          {cert.truckNumber ? ` · ${cert.truckNumber}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {cert.status !== 'sent' && cert.status !== 'archived' && (
          <button onClick={onSent} style={{ padding: '5px 11px', border: '0.5px solid #1d9e75', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#0f6e56' }}>
            ✓ Wysłany
          </button>
        )}
        <button onClick={onView} style={{ padding: '5px 11px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12 }}>
          Podgląd
        </button>
        <button onClick={onDelete} style={{ padding: '5px 9px', border: 'none', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#a32d2d' }}>
          ×
        </button>
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10 }}>
      <div style={{
        width: 20, height: 20, border: '2px solid var(--color-border-tertiary)',
        borderTopColor: '#0f6e56', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Ładowanie...</span>
    </div>
  )
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div style={{ background: '#fcebeb', border: '0.5px solid #f09595', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: '#a32d2d' }}>⚠ {message}</span>
      {onDismiss && <button onClick={onDismiss} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', fontSize: 16, padding: '0 4px' }}>×</button>}
    </div>
  )
}
