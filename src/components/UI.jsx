import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const iStyle = {
  padding: '7px 10px', fontSize: 13, borderRadius: 8,
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
  boxSizing: 'border-box', width: '100%',
}

export function Inp({ value, onChange, type = 'text', placeholder, style, min, max, disabled }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max} disabled={disabled}
      style={{ ...iStyle, ...style, opacity: disabled ? 0.5 : 1 }} />
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
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 14px', ...style }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  )
}

export function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: '7px 4px', border: '0.5px solid', cursor: 'pointer', fontSize: 12, borderRadius: 8,
          borderColor: value === v ? '#1d9e75' : 'var(--color-border-tertiary)',
          background: value === v ? '#e1f5ee' : 'transparent',
          color: value === v ? '#085041' : 'var(--color-text-primary)',
          fontWeight: value === v ? 500 : 400,
        }}>{l}</button>
      ))}
    </div>
  )
}

function useDropdownRect(ref, open) {
  const [rect, setRect] = useState(null)
  const update = useCallback(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const dropH = 340
    setRect({
      triggerBottom: r.bottom,
      triggerTop: r.top,
      left: r.left,
      width: r.width,
      openAbove: spaceBelow < dropH && spaceAbove > spaceBelow,
      dropH,
    })
  }, [ref])

  useEffect(() => {
    if (!open) { setRect(null); return }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, update])

  return rect
}

export function BuyerCombo({ value, buyers, onSelect, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = (buyers || []).filter(b =>
    !search ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.address?.toLowerCase().includes(search.toLowerCase()) ||
    b.nip?.toLowerCase().includes(search.toLowerCase())
  )
  const selected = (buyers || []).find(b => b.name === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => { setOpen(v => !v); setSearch('') }}
        style={{
          ...iStyle, cursor: 'pointer', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          minHeight: selected ? 64 : 36, userSelect: 'none',
          position: 'relative', zIndex: open ? 10001 : 1,
        }}
      >
        {selected ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 1 }}>{selected.name}</div>
            {selected.address && (
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {selected.address}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              {selected.nip && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>🏷 {selected.nip}</div>}
              {selected.delivery_address && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🚚 {selected.delivery_address}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {placeholder || 'Wybierz klienta...'}
          </span>
        )}
        <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown — ABSOLUTNY względem rodzica, POWYŻEJ triggera */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0, right: 0,
          marginBottom: 2,
          zIndex: 10000,
          background: 'var(--color-background-primary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 8,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj po nazwie, adresie, NIP..."
              style={{ ...iStyle, fontSize: 12, padding: '5px 8px' }}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>Brak wyników</div>
              : filtered.map(b => (
                <div key={b.id}
                  onMouseDown={e => { e.preventDefault(); onSelect(b); setOpen(false); setSearch('') }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    background: b.name === value ? 'var(--color-background-secondary)' : 'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = b.name === value ? 'var(--color-background-secondary)' : 'transparent'}
                >
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{b.name}</div>
                  {b.address && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 1 }}>📍 {b.address}</div>}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {b.nip && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>🏷 NIP: {b.nip}</div>}
                    {b.delivery_address && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>🚚 {b.delivery_address}</div>}
                  </div>
                </div>
              ))
            }
          </div>
          {/* Clear */}
          {value && (
            <div
              onMouseDown={e => { e.preventDefault(); onSelect(null); setOpen(false); setSearch('') }}
              style={{ padding: '8px 14px', fontSize: 12, color: '#a32d2d', cursor: 'pointer', borderTop: '0.5px solid var(--color-border-tertiary)', textAlign: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fcebeb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✕ Wyczyść wybór
            </div>
          )}
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
  const fmtD = d => {
    if (!d) return ''
    const s = d.slice(0, 10)
    const [y, m, day] = s.split('-')
    return `${day}.${m}.${y}`
  }
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
        width: 20, height: 20,
        border: '2px solid var(--color-border-tertiary)',
        borderTopColor: '#0f6e56',
        borderRadius: '50%',
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
    <div style={{
      background: '#fcebeb', border: '0.5px solid #f09595', borderRadius: 8,
      padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 12,
    }}>
      <span style={{ fontSize: 13, color: '#a32d2d' }}>⚠ {message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', fontSize: 16, padding: '0 4px' }}>×</button>
      )}
    </div>
  )
}

export function PageLayout({ topZone, children }) {
  const topRef = useRef(null)
  const [topHeight, setTopHeight] = useState(0)

  useEffect(() => {
    if (!topRef.current) return
    const obs = new ResizeObserver(() => setTopHeight(topRef.current?.offsetHeight || 0))
    obs.observe(topRef.current)
    setTopHeight(topRef.current.offsetHeight)
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div ref={topRef} style={{
        flexShrink: 0,
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        zIndex: 10,
      }}>
        {topZone}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

export function ImportModal({ type, onImport, onClose }) {
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')
  const fileRef = useRef()

  const HEADERS = {
    buyers:    ['name', 'address', 'nip', 'deliveryAddress'],
    products:  ['code', 'nameEn', 'namePl'],
    packagings: ['namePl', 'nameEn', 'bagKg', 'bagsPerPallet'],
  }
  const LABELS = {
    buyers:    ['Nazwa', 'Adres siedziby', 'NIP', 'Adres dostawy'],
    products:  ['Kod', 'Nazwa EN', 'Nazwa PL'],
    packagings: ['Nazwa PL', 'Nazwa EN', 'Waga szt. (kg)', 'Szt./paleta'],
  }
  const typeLabel = { buyers: 'Klientów', products: 'Produktów', packagings: 'Opakowań' }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    const start = isNaN(lines[0]?.split(/[,;]/)[0]?.trim()) && lines[0]?.split(/[,;]/).length >= 2 ? 1 : 0
    return lines.slice(start).map(line => {
      const cols = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''))
      const headers = HEADERS[type]
      const obj = {}
      headers.forEach((h, i) => { obj[h] = cols[i] || '' })
      return obj
    }).filter(r => Object.values(r).some(v => v))
  }

  function tryDecode(buffer) {
    // Sprawdź BOM UTF-8
    const bytes = new Uint8Array(buffer)
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return new TextDecoder('UTF-8').decode(buffer)
    }
    // Próbuj UTF-8 strict
    try {
      const text = new TextDecoder('UTF-8', { fatal: true }).decode(buffer)
      if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return text
    } catch {}
    // Próbuj Windows-1250 (Excel Polska)
    try {
      const text = new TextDecoder('windows-1250', { fatal: true }).decode(buffer)
      if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return text
    } catch {}
    // Próbuj ISO-8859-2
    try {
      const text = new TextDecoder('iso-8859-2', { fatal: true }).decode(buffer)
      if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return text
    } catch {}
    // Fallback windows-1250 bez strict
    return new TextDecoder('windows-1250').decode(buffer)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const buffer = ev.target.result
        const text = tryDecode(buffer)
        const parsed = parseCSV(text)
        if (!parsed.length) {
          setError('Nie znaleziono danych. Upewnij się że plik jest w formacie CSV.')
          return
        }
        setRows(parsed)
        setPreview(parsed.slice(0, 5))
      } catch (err) {
        setError('Błąd parsowania pliku: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 12, padding: 24,
        width: 580, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>📥 Import {typeLabel[type]}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-secondary)' }}>×</button>
        </div>

        {/* Format info */}
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Format pliku CSV — kolumny w kolejności:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--color-background-primary)', padding: '4px 8px', borderRadius: 6, marginBottom: 6 }}>
            {LABELS[type].join(' ; ')}
          </div>
          <div>Rozdzielnik: przecinek lub średnik. Pierwsza linia może być nagłówkiem.</div>
          <div style={{ marginTop: 6, color: '#856404', background: '#fff3cd', borderRadius: 6, padding: '4px 8px' }}>
            💡 Aby zachować polskie znaki: w Excelu wybierz <strong>Plik → Zapisz jako → CSV UTF-8 (z BOM)</strong>
          </div>
        </div>

        {/* File picker */}
        <div style={{ marginBottom: 14 }}>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ padding: '8px 16px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
            📂 Wybierz plik CSV
          </button>
          {rows.length > 0 && (
            <span style={{ marginLeft: 10, fontSize: 13, color: '#0f6e56', fontWeight: 500 }}>
              ✓ {rows.length} wierszy gotowych do importu
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fcebeb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#a32d2d', marginBottom: 12 }}>
            ⚠ {error}
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Podgląd (pierwsze {preview.length} wierszy):
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {LABELS[type].map(l => (
                      <th key={l} style={{
                        border: '0.5px solid var(--color-border-tertiary)',
                        padding: '4px 8px',
                        background: 'var(--color-background-secondary)',
                        textAlign: 'left', fontWeight: 500,
                      }}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      {HEADERS[type].map(h => (
                        <td key={h} style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '4px 8px' }}>
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
            Anuluj
          </button>
          <button
            disabled={!rows.length}
            onClick={() => { onImport(rows); onClose() }}
            style={{
              padding: '8px 20px',
              background: rows.length ? '#0f6e56' : '#ccc',
              color: '#fff', border: 'none', borderRadius: 8,
              cursor: rows.length ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 500,
            }}>
            Importuj {rows.length > 0 ? `${rows.length} wierszy` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
