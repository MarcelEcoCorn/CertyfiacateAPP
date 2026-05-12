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

export function BuyerCombo({ value, buyers, onSelect, placeholder }) {
  const [mode, setMode] = useState('search')
  const [search, setSearch] = useState('')
  const [manualName, setManualName] = useState('')

  const selected = (buyers || []).find(b => b.name === value)
  const listId = 'buyers-datalist'

  function handleDatalistChange(e) {
    const typed = e.target.value
    setSearch(typed)
    const match = (buyers || []).find(b => b.name === typed)
    if (match) onSelect(match)
    else if (typed) onSelect({ name: typed, address: '', nip: '', delivery_address: '' })
    else onSelect(null)
  }

  function handleManual(v) {
    setManualName(v)
    onSelect({ name: v, address: '', nip: '', delivery_address: '' })
  }

  function switchMode(m) {
    setMode(m); setSearch(''); setManualName(''); onSelect(null)
  }

  const btnStyle = active => ({
    padding: '4px 12px', border: '0.5px solid', borderRadius: 7,
    cursor: 'pointer', fontSize: 12,
    borderColor: active ? '#185fa5' : 'var(--color-border-tertiary)',
    background: active ? '#e6f1fb' : 'transparent',
    color: active ? '#042c53' : 'var(--color-text-secondary)',
    fontWeight: active ? 500 : 400,
  })

  const ClientCard = ({ client }) => (
    <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--color-background-secondary)', borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 500, marginBottom: 2 }}>{client.name}</div>
      {client.address && <div style={{ color: 'var(--color-text-secondary)' }}>📍 {client.address}</div>}
      {client.nip && <div style={{ color: 'var(--color-text-secondary)' }}>🏷 NIP: {client.nip}</div>}
      {client.delivery_address && <div style={{ color: 'var(--color-text-secondary)' }}>🚚 {client.delivery_address}</div>}
      <button
        onClick={() => { onSelect(null); setSearch(''); setManualName('') }}
        style={{ marginTop: 4, fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', padding: 0 }}>
        ✕ Wyczyść
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={() => switchMode('search')} style={btnStyle(mode === 'search')}>🔍 Szukaj / wpisz</button>
        <button onClick={() => switchMode('manual')} style={btnStyle(mode === 'manual')}>✏️ Ręcznie</button>
      </div>

      {mode === 'search' && (
        <div>
          <datalist id={listId}>
            {(buyers || []).map(b => (
              <option key={b.id} value={b.name}>
                {b.nip ? `NIP: ${b.nip}` : ''} {b.address || ''}
              </option>
            ))}
          </datalist>
          <input
            list={listId}
            value={search}
            onChange={handleDatalistChange}
            placeholder="Zacznij wpisywać nazwę klienta..."
            style={{ ...iStyle }}
          />
          {selected && <ClientCard client={selected} />}
          {value && !selected && value.trim() && (
            <div style={{ marginTop: 6, padding: '6px 12px', background: 'var(--color-background-secondary)', borderRadius: 8, fontSize: 12 }}>
              <span style={{ fontWeight: 500 }}>{value}</span>
              <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8, fontSize: 11 }}>(spoza bazy)</span>
              <button onClick={() => { onSelect(null); setSearch('') }} style={{ marginLeft: 8, fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', padding: 0 }}>✕</button>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <input
            autoFocus
            value={manualName}
            onChange={e => handleManual(e.target.value)}
            placeholder="Wpisz nazwę nabywcy..."
            style={{ ...iStyle }}
          />
          {manualName && (
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Adres wpisz w polu "Adres na dokumencie" poniżej
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
    buyers:     ['name', 'address', 'nip', 'deliveryAddress'],
    products:   ['code', 'nameEn', 'namePl'],
    packagings: ['namePl', 'nameEn', 'bagKg', 'bagsPerPallet'],
  }
  const LABELS = {
    buyers:     ['Nazwa firmy', 'Adres siedziby', 'NIP', 'Adres dostawy'],
    products:   ['Kod produktu', 'Nazwa EN', 'Nazwa PL'],
    packagings: ['Nazwa PL', 'Nazwa EN', 'Waga szt. (kg)', 'Szt./paleta'],
  }
  const EXAMPLES = {
    buyers:     'OHO GROUP UAB;Jiesios G.2 Kauno Lithuania;123-456-789;ul. Dostawcza 1',
    products:   '4.1/P;Dried Potato Powder;Suszone Puree Ziemniaczane',
    packagings: 'Worek papierowy 25kg;Papper Bag 25kg;25;40',
  }
  const typeLabel = { buyers: 'Klientów', products: 'Produktów', packagings: 'Opakowań' }
  const typeIcon  = { buyers: '👤', products: '📦', packagings: '🗃️' }

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
    const bytes = new Uint8Array(buffer)
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
      return new TextDecoder('UTF-8').decode(buffer)
    try {
      const text = new TextDecoder('UTF-8', { fatal: true }).decode(buffer)
      if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return text
    } catch {}
    try {
      const text = new TextDecoder('windows-1250', { fatal: true }).decode(buffer)
      if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return text
    } catch {}
    try {
      const text = new TextDecoder('iso-8859-2', { fatal: true }).decode(buffer)
      if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return text
    } catch {}
    return new TextDecoder('windows-1250').decode(buffer)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = tryDecode(ev.target.result)
        const parsed = parseCSV(text)
        if (!parsed.length) { setError('Nie znaleziono danych. Sprawdź format pliku.'); return }
        setRows(parsed)
        setPreview(parsed.slice(0, 5))
      } catch (err) { setError('Błąd parsowania: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  const Step = ({ num, title }) => (
    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        background: '#185fa5', color: '#fff', borderRadius: '50%',
        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, flexShrink: 0,
      }}>{num}</span>
      {title}
    </div>
  )

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative', zIndex: 99999,
        color: '#111',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8f9fa', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
              {typeIcon[type]} Import {typeLabel[type]}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              Wczytaj dane z pliku CSV lub Excel
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, border: '1px solid #ddd',
            background: '#fff', borderRadius: 8, cursor: 'pointer',
            fontSize: 18, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* Krok 1 */}
          <div style={{ marginBottom: 20 }}>
            <Step num="1" title="Przygotuj plik w Excelu" />
            <div style={{ background: '#f4f6f8', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#333' }}>
              <div style={{ marginBottom: 8, color: '#555' }}>
                Kolumny w kolejności (rozdzielnik: <strong>średnik</strong> lub przecinek):
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {LABELS[type].map((l, i) => (
                  <span key={l} style={{
                    background: '#fff', border: '1px solid #ddd',
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 500, color: '#333',
                  }}>
                    {i + 1}. {l}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>Przykładowy wiersz:</div>
              <div style={{
                fontFamily: 'monospace', fontSize: 11, color: '#333',
                background: '#fff', border: '1px solid #e0e0e0',
                borderRadius: 6, padding: '6px 10px', wordBreak: 'break-all',
              }}>
                {EXAMPLES[type]}
              </div>
            </div>
          </div>

          {/* Krok 2 */}
          <div style={{ marginBottom: 20 }}>
            <Step num="2" title="Zapisz jako CSV z polskimi znakami" />
            <div style={{ background: '#fffbea', border: '1px solid #f0c040', borderRadius: 10, padding: '12px 14px', fontSize: 12 }}>
              <div style={{ fontWeight: 500, marginBottom: 8, color: '#5a4000' }}>
                💡 Aby zachować polskie znaki (ą, ę, ó, ś...):
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ background: '#185fa5', color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>Excel</span>
                <span style={{ color: '#444' }}>Plik → <strong>Zapisz jako</strong> → typ: <strong>CSV UTF-8 (z BOM) (*.csv)</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ background: '#0f6e56', color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>Sheets</span>
                <span style={{ color: '#444' }}>Plik → <strong>Pobierz</strong> → <strong>Wartości rozdzielane przecinkami (.csv)</strong></span>
              </div>
            </div>
          </div>

          {/* Krok 3 */}
          <div style={{ marginBottom: 20 }}>
            <Step num="3" title="Wczytaj plik" />
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '14px',
                border: '2px dashed #ccc', borderRadius: 10,
                background: '#fafafa', cursor: 'pointer',
                fontSize: 13, color: '#555',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#185fa5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#ccc'}
            >
              📂 <span>Kliknij aby wybrać plik CSV</span>
            </button>

            {error && (
              <div style={{ marginTop: 10, background: '#fdecea', border: '1px solid #f5c6c6', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b71c1c' }}>
                ⚠ {error}
              </div>
            )}

            {rows.length > 0 && !error && (
              <div style={{ marginTop: 10, background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <span>Wczytano <strong>{rows.length} wierszy</strong> — gotowe do importu</span>
              </div>
            )}
          </div>

          {/* Podgląd */}
          {preview.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 8 }}>
                Podgląd pierwszych {preview.length} wierszy:
              </div>
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f4f6f8' }}>
                      {LABELS[type].map(l => (
                        <th key={l} style={{ border: '1px solid #e0e0e0', padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#333' }}>{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        {HEADERS[type].map(h => (
                          <td key={h} style={{ border: '1px solid #e0e0e0', padding: '5px 10px', color: '#333' }}>{r[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Przyciski */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '9px 20px', border: '1px solid #ddd',
              borderRadius: 9, background: '#fff', cursor: 'pointer',
              fontSize: 13, color: '#555',
            }}>
              Anuluj
            </button>
            <button
              disabled={!rows.length}
              onClick={() => { onImport(rows); onClose() }}
              style={{
                padding: '9px 24px',
                background: rows.length ? '#0f6e56' : '#ccc',
                color: '#fff', border: 'none', borderRadius: 9,
                cursor: rows.length ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 500,
              }}
            >
              {rows.length > 0 ? `✓ Importuj ${rows.length} wierszy` : 'Importuj'}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  )
}
