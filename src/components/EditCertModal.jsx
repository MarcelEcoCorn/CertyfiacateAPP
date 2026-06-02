import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { fmtD, addDays, yearShort, generateLots } from '../lib/constants.js'

// Lokalny LotGrid — bez importu z UI.jsx żeby uniknąć circular import
function LotGrid({ lots }) {
  if (!lots || !lots.length) return null
  const half = Math.ceil(lots.length / 2)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
      {Array.from({ length: half }, (_, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {[lots[i], lots[i + half]].map((lot, j) => lot ? (
            <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontSize: 11, color: '#777', minWidth: 22, textAlign: 'right' }}>
                {j === 0 ? i + 1 : i + half + 1}.
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, flex: 1, background: '#f4f6f8', border: '0.5px solid #ddd', borderRadius: 4, padding: '1px 6px' }}>
                {lot.lot}
              </span>
              <span style={{ fontSize: 11, color: '#777', whiteSpace: 'nowrap' }}>
                {lot.qty.toLocaleString()} kg
              </span>
            </div>
          ) : <div key={j} />)}
        </div>
      ))}
    </div>
  )
}

const iStyle = {
  padding: '7px 10px', fontSize: 13, borderRadius: 8,
  border: '1px solid #ddd', background: '#fff',
  color: '#111', boxSizing: 'border-box', width: '100%',
}

export default function EditCertModal({ cert, buyers, products, packagings, saving, onSave, onClose }) {
  const [f, setF] = useState({
    buyer:          cert.buyer || '',
    buyerAddress:   cert.buyerAddress || '',
    productCode:    cert.productCode || '',
    packaging:      cert.packaging || '',
    dateLoading:    cert.dateLoading?.slice(0, 10) || '',
    dateProduction: cert.dateProduction?.slice(0, 10) || '',
    bestBefore:     cert.bestBefore?.slice(0, 10) || '',
    origin:         cert.origin || 'Poland',
    pallets:        cert.pallets || 1,
    lotPrefix:      cert.lots?.[0]?.lot?.replace(/\d+$/, '') || '',
    lotNumber:      cert.lots?.[0]?.lot?.match(/(\d+)$/)?.[1] || '',
    manualLots:     false,
    customLots:     cert.lots || [],
    notes:          cert.notes || '',
    lang:           cert.lang || 'EN',
  })

  function sf(k, v) { setF(p => ({ ...p, [k]: v })) }

  const packInfo = packagings.find(p => p.label === f.packaging || p.value === f.packaging) || packagings[0]
  const product = products.find(p => p.code === f.productCode) || products[0]
  const kgPerLot = packInfo ? packInfo.bagKg * packInfo.bagsPerPallet : cert.kgPerLot || 1000
  const numPallets = Math.max(1, Math.min(34, Number(f.pallets) || 1))
  const totalKg = numPallets * kgPerLot

  const autoLots = useMemo(
    () => generateLots(f.lotPrefix, f.lotNumber, numPallets, kgPerLot),
    [f.lotPrefix, f.lotNumber, numPallets, kgPerLot]
  )
  const activeLots = f.manualLots ? f.customLots : (autoLots.length > 0 ? autoLots : cert.lots || [])

  function handleSave() {
    onSave({
      buyer:          f.buyer,
      buyerAddress:   f.buyerAddress,
      productCode:    f.productCode,
      productName:    product?.name || cert.productName,
      dateLoading:    f.dateLoading,
      dateProduction: f.dateProduction,
      bestBefore:     f.bestBefore,
      packaging:      packInfo?.label || f.packaging,
      origin:         f.origin,
      pallets:        numPallets,
      kgPerLot:       kgPerLot,
      totalKg:        totalKg,
      lots:           activeLots,
      notes:          f.notes,
      lang:           f.lang,
    })
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 660,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        color: '#111',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>✏️ Edycja certyfikatu</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Nr {cert.certNumber}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 18, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Nabywca */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Nabywca</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Nazwa *</div>
                <input value={f.buyer} onChange={e => sf('buyer', e.target.value)} style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Adres na dokumencie</div>
                <input value={f.buyerAddress} onChange={e => sf('buyerAddress', e.target.value)} style={iStyle} />
              </div>
            </div>
          </div>

          {/* Produkt i opakowanie */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Produkt i opakowanie</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Produkt</div>
                <select value={f.productCode} onChange={e => sf('productCode', e.target.value)} style={iStyle}>
                  {products.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Opakowanie</div>
                <select value={packInfo?.label || f.packaging} onChange={e => sf('packaging', e.target.value)} style={iStyle}>
                  {packagings.map(p => <option key={p.id} value={p.label}>{p.labelPL || p.label} → {(p.bagKg * p.bagsPerPallet).toLocaleString()} kg/paleta</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Daty */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Daty</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Data załadunku</div>
                <input type="date" value={f.dateLoading} onChange={e => sf('dateLoading', e.target.value)} style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Data produkcji</div>
                <input type="date" value={f.dateProduction} onChange={e => sf('dateProduction', e.target.value)} style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Data przydatności</div>
                <input type="date" value={f.bestBefore} onChange={e => sf('bestBefore', e.target.value)} style={iStyle} />
              </div>
            </div>
          </div>

          {/* Palety i LOT */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Palety i numery LOT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Liczba palet</div>
                <input type="number" min="1" max="34" value={f.pallets} onChange={e => sf('pallets', Number(e.target.value))} style={{ ...iStyle, textAlign: 'center', fontWeight: 500 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Prefiks LOT</div>
                <input value={f.lotPrefix} onChange={e => sf('lotPrefix', e.target.value)} style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Numer partii</div>
                <input value={f.lotNumber} onChange={e => sf('lotNumber', e.target.value)} style={iStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Kraj pochodzenia</div>
                <select value={f.origin} onChange={e => sf('origin', e.target.value)} style={iStyle}>
                  <option value="Poland">Poland</option>
                  <option value="Polska">Polska</option>
                </select>
              </div>
            </div>

            {autoLots.length > 0 && !f.manualLots && (
              <div style={{ background: '#f4f6f8', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>✓ {autoLots.length} palet · {totalKg.toLocaleString()} kg</span>
                  <button onClick={() => setF(p => ({ ...p, manualLots: true, customLots: autoLots }))} style={{ fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: '#666', textDecoration: 'underline' }}>Edytuj ręcznie</button>
                </div>
                <LotGrid lots={autoLots} />
              </div>
            )}

            {f.manualLots && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#555' }}>Tryb ręczny · {f.customLots.length} partii</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => sf('manualLots', false)} style={{ fontSize: 11, border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', padding: '3px 10px', color: '#555' }}>← Auto</button>
                    <button onClick={() => setF(p => ({ ...p, customLots: [...p.customLots, { lot: p.lotPrefix + p.lotNumber, qty: kgPerLot }] }))} style={{ fontSize: 11, border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', padding: '3px 10px', color: '#555' }}>+ Partia</button>
                  </div>
                </div>
                {f.customLots.map((lot, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#777', minWidth: 22 }}>{i + 1}.</span>
                    <input value={lot.lot} onChange={e => { const c = [...f.customLots]; c[i] = { ...c[i], lot: e.target.value }; sf('customLots', c) }} style={{ ...iStyle, flex: 2 }} />
                    <input type="number" value={lot.qty} onChange={e => { const c = [...f.customLots]; c[i] = { ...c[i], qty: Number(e.target.value) }; sf('customLots', c) }} style={{ ...iStyle, width: 90 }} />
                    <span style={{ fontSize: 12, color: '#777' }}>kg</span>
                    <button onClick={() => sf('customLots', f.customLots.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', fontSize: 16 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Uwagi */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Uwagi (opcjonalne)</div>
            <textarea
              value={f.notes}
              onChange={e => sf('notes', e.target.value)}
              placeholder="np. Order No. 12345 / PO-2026-001"
              rows={2}
              style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Język */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Język dokumentu</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['EN', 'English'], ['PL', 'Polski']].map(([v, l]) => (
                <button key={v} onClick={() => sf('lang', v)} style={{
                  padding: '6px 16px', border: '1px solid', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                  borderColor: f.lang === v ? '#185fa5' : '#ddd',
                  background: f.lang === v ? '#e6f1fb' : '#fff',
                  color: f.lang === v ? '#042c53' : '#555',
                  fontWeight: f.lang === v ? 500 : 400,
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Przyciski */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #eee' }}>
            <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' }}>
              Anuluj
            </button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '9px 24px', background: saving ? '#ccc' : '#0f6e56',
              color: '#fff', border: 'none', borderRadius: 9,
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              {saving ? 'Zapisywanie...' : '✓ Zapisz zmiany'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
