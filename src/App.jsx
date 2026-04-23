import { useState, useEffect, useMemo } from 'react'
import {
  fetchCertificates, saveCertificate, updateCertificateStatus,
  deleteCertificate, fetchBuyers, saveBuyer, deleteBuyer,
  fetchCurrentCounter, archiveCertificate,
} from './lib/supabase.js'
import {
  PRODUCTS, PACKAGINGS, today, fmtD, addYear, yearShort, generateLots,
} from './lib/constants.js'
import { Inp, Sel, Lbl, Sec, Toggle, Combo, LotGrid, CertRow, Spinner, ErrorBanner } from './components/UI.jsx'
import Preview from './components/Preview.jsx'

export default function App() {
  const [tab, setTab] = useState(0)
  const [certs, setCerts] = useState([])
  const [buyers, setBuyers] = useState([])
  const [nextCounter, setNextCounter] = useState('…')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [filterBuyer, setFilterBuyer] = useState('')
  const [filterProduct, setFilterProduct] = useState('')

  // ── Load data from Supabase ──
  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [certsData, buyersData, counter] = await Promise.all([
        fetchCertificates(),
        fetchBuyers(),
        fetchCurrentCounter(),
      ])
      setCerts(certsData)
      setBuyers(buyersData)
      setNextCounter(counter)
    } catch (e) {
      setError('Błąd połączenia z bazą danych: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  // ── New document form ──
  const [lang, setLang] = useState('EN')
  const [docType, setDocType] = useState('both')
  const [f, setF] = useState({
    buyerName: '', buyerAddress: '',
    productCode: '4.1/P', packaging: 'PAPPER BAGS 25',
    pallets: 9,
    lotPrefix: `4.1/P/${yearShort()}/`, lotSerial: '',
    manualLots: false, customLots: [],
    dateLoading: today(), dateProduction: '',
    truckNumber: '', origin: 'Poland',
  })

  const packInfo = PACKAGINGS.find(p => p.value === f.packaging) || PACKAGINGS[0]
  const product = PRODUCTS.find(p => p.code === f.productCode) || PRODUCTS[0]
  const kgPerLot = packInfo.bagKg * packInfo.bagsPerPallet
  const numPallets = Math.max(1, Math.min(34, Number(f.pallets) || 1))
  const totalKg = numPallets * kgPerLot
  const grossKg = Math.round(totalKg * 1.031)
  const dateProd = f.dateProduction || (() => {
    const d = new Date(f.dateLoading); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
  })()
  const bestBefore = addYear(dateProd)

  const autoLots = useMemo(
    () => generateLots(f.lotPrefix, f.lotSerial, numPallets, kgPerLot),
    [f.lotPrefix, f.lotSerial, numPallets, kgPerLot]
  )
  const activeLots = f.manualLots ? f.customLots : autoLots

  function sf(k, v) { setF(p => ({ ...p, [k]: v })) }

  function onProductChange(code) {
    setF(p => ({ ...p, productCode: code, lotPrefix: `${code}/${yearShort()}/` }))
  }

  function onBuyerSelect(name) {
    const b = buyers.find(b => b.name === name)
    setF(p => ({ ...p, buyerName: name, buyerAddress: b?.address || p.buyerAddress }))
  }

  const formErrors = useMemo(() => {
    const e = []
    if (!f.buyerName.trim()) e.push('Podaj nazwę nabywcy')
    if (!f.manualLots && !f.lotSerial.trim()) e.push('Podaj numer seryjny pierwszej partii LOT (np. 171)')
    if (f.manualLots && f.customLots.some(l => !l.lot.trim())) e.push('Uzupełnij wszystkie numery partii')
    if (!f.truckNumber.trim()) e.push('Podaj numer ciężarówki')
    return e
  }, [f])

  function openPreview() {
    const doc = {
      buyer: f.buyerName, buyerAddress: f.buyerAddress,
      productCode: f.productCode, productName: product.name,
      dateLoading: f.dateLoading, dateProduction: dateProd, bestBefore,
      packaging: f.packaging, origin: f.origin, truckNumber: f.truckNumber,
      lots: activeLots, totalKg, grossKg, pallets: numPallets, kgPerLot,
      lang, docType, status: 'saved',
    }
    setPreview(doc)
  }

  async function handleSave(doc) {
    setSaving(true)
    setError(null)
    try {
      // Save buyer if new
      if (doc.buyer && !buyers.find(b => b.name === doc.buyer)) {
        await saveBuyer(doc.buyer, doc.buyerAddress || '')
      }
      const saved = await saveCertificate(doc)
      setCerts(c => [saved, ...c])
      setNextCounter(n => (typeof n === 'number' ? n + 1 : n))
      setPreview(null)
      setTab(1)
      // Reset form (keep buyer + product for next doc)
      setF(p => ({ ...p, lotSerial: '', truckNumber: '', dateProduction: '', pallets: 9, manualLots: false, customLots: [] }))
      // Reload buyers list
      const fresh = await fetchBuyers()
      setBuyers(fresh)
    } catch (e) {
      setError('Błąd zapisu: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkSent(id) {
    try {
      const updated = await updateCertificateStatus(id, 'sent', { sent_date: today() })
      setCerts(c => c.map(x => x.id === id ? updated : x))
    } catch (e) {
      setError('Błąd aktualizacji: ' + e.message)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Usunąć certyfikat z bazy?')) return
    try {
      await deleteCertificate(id)
      setCerts(c => c.filter(x => x.id !== id))
    } catch (e) {
      setError('Błąd usuwania: ' + e.message)
    }
  }

  // ── Buyers management ──
  const [newBuyerName, setNewBuyerName] = useState('')
  const [newBuyerAddr, setNewBuyerAddr] = useState('')

  async function handleAddBuyer() {
    if (!newBuyerName.trim()) return
    try {
      const b = await saveBuyer(newBuyerName.trim(), newBuyerAddr.trim())
      setBuyers(prev => {
        const exists = prev.find(x => x.id === b.id)
        return exists ? prev.map(x => x.id === b.id ? b : x) : [...prev, b]
      })
      setNewBuyerName(''); setNewBuyerAddr('')
    } catch (e) {
      setError('Błąd zapisu nabywcy: ' + e.message)
    }
  }

  async function handleDeleteBuyer(id) {
    if (!window.confirm('Usunąć nabywcę?')) return
    try {
      await deleteBuyer(id)
      setBuyers(b => b.filter(x => x.id !== id))
    } catch (e) {
      setError('Błąd usuwania nabywcy: ' + e.message)
    }
  }

  // ── Archive import ──
  const [archOpen, setArchOpen] = useState(false)
  const [arch, setArch] = useState({
    certNumber: '', buyerName: '', buyerAddress: '', productCode: '4.1/P',
    packaging: 'PAPPER BAGS 25', pallets: 2,
    lotPrefix: `4.1/P/${yearShort()}/`, lotSerial: '',
    dateLoading: today(), dateProduction: '', truckNumber: '', sentDate: today(),
  })
  function sa(k, v) { setArch(p => ({ ...p, [k]: v })) }

  async function handleArchiveSave() {
    if (!arch.certNumber.trim() || !arch.buyerName.trim() || !arch.lotSerial.trim()) {
      setError('Uzupełnij: numer certyfikatu, nabywcę i numer LOT')
      return
    }
    const ap = PACKAGINGS.find(p => p.value === arch.packaging) || PACKAGINGS[0]
    const akpL = ap.bagKg * ap.bagsPerPallet
    const alots = generateLots(arch.lotPrefix, arch.lotSerial, Number(arch.pallets), akpL)
    const aprod = arch.dateProduction || (() => { const d = new Date(arch.dateLoading); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
    const doc = {
      certNumber: arch.certNumber,
      buyer: arch.buyerName, buyerAddress: arch.buyerAddress,
      productCode: arch.productCode,
      productName: PRODUCTS.find(p => p.code === arch.productCode)?.name || '',
      dateLoading: arch.dateLoading, dateProduction: aprod, bestBefore: addYear(aprod),
      packaging: arch.packaging, origin: 'Poland', truckNumber: arch.truckNumber,
      lots: alots, totalKg: Number(arch.pallets) * akpL,
      grossKg: Math.round(Number(arch.pallets) * akpL * 1.031),
      pallets: Number(arch.pallets), kgPerLot: akpL,
      lang: 'EN', docType: 'both', status: 'archived', sentDate: arch.sentDate,
    }
    setSaving(true)
    try {
      const saved = await archiveCertificate(doc)
      setCerts(c => [saved, ...c])
      setArchOpen(false)
      setArch(p => ({ ...p, certNumber: '', lotSerial: '', truckNumber: '' }))
    } catch (e) {
      setError('Błąd archiwizacji: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredCerts = certs.filter(c =>
    (!filterBuyer || c.buyer?.toLowerCase().includes(filterBuyer.toLowerCase())) &&
    (!filterProduct || c.productCode === filterProduct)
  )

  // ── Render preview ──
  if (preview) return (
    <Preview
      doc={preview}
      onSave={handleSave}
      onBack={() => setPreview(null)}
      saving={saving}
    />
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 860, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '14px 20px 0', background: 'var(--color-background-primary)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: 1 }}>🌿 ECOCORN</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              System certyfikatów jakości · Eco-corn Sp. z o.o.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Następny nr certyfikatu</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{nextCounter}/2026/EN</div>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          {['Nowy dokument', 'Baza certyfikatów', 'Archiwum', 'Nabywcy'].map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              padding: '7px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === i ? 500 : 400,
              color: tab === i ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              borderBottom: tab === i ? '2px solid var(--color-text-primary)' : '2px solid transparent',
            }}>{t}</button>
          ))}
          <button onClick={loadAll} style={{ marginLeft: 'auto', padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            ↺ Odśwież
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* ── TAB 0: NEW DOCUMENT ── */}
        {tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Sec label="Typ dokumentu">
                <Toggle options={[['both', 'QC + Packing List'], ['qc', 'Quality Certificate'], ['pl', 'Packing List']]} value={docType} onChange={setDocType} />
              </Sec>
              <Sec label="Język dokumentu">
                <Toggle options={[['EN', 'English'], ['PL', 'Polski']]} value={lang} onChange={setLang} />
              </Sec>
            </div>

            <Sec label="Nabywca">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Lbl>Firma <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(wybierz lub wpisz nową)</span></Lbl>
                  <Combo value={f.buyerName} options={buyers.map(b => b.name)} onChange={onBuyerSelect} placeholder="Nazwa nabywcy..." />
                </div>
                <div>
                  <Lbl>Adres <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(auto po wyborze)</span></Lbl>
                  <Inp value={f.buyerAddress} onChange={v => sf('buyerAddress', v)} placeholder="Adres..." />
                </div>
              </div>
            </Sec>

            <Sec label="Produkt i opakowanie">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Lbl>Produkt</Lbl>
                  <Sel value={f.productCode} onChange={onProductChange} options={PRODUCTS.map(p => ({ value: p.code, label: `${p.code} — ${p.name}` }))} />
                </div>
                <div>
                  <Lbl>Opakowanie <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>→ {kgPerLot.toLocaleString()} kg/paleta</span></Lbl>
                  <Sel value={f.packaging} onChange={v => sf('packaging', v)} options={PACKAGINGS.map(p => ({ value: p.value, label: `${p.label} → ${(p.bagKg * p.bagsPerPallet).toLocaleString()} kg/paleta` }))} />
                </div>
              </div>
            </Sec>

            <Sec label="Palety i numery partii LOT — wpisz 3 pola, tabela generuje się automatycznie">
              <div style={{ display: 'grid', gridTemplateColumns: '100px 160px 140px 1fr', gap: 10, alignItems: 'end', marginBottom: 12 }}>
                <div>
                  <Lbl>Liczba palet</Lbl>
                  <Inp type="number" min="1" max="34" value={f.pallets}
                    onChange={v => sf('pallets', Math.max(1, Math.min(34, Number(v) || 1)))}
                    style={{ fontWeight: 500, fontSize: 16, textAlign: 'center' }} />
                </div>
                <div>
                  <Lbl>Prefiks LOT <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(auto)</span></Lbl>
                  <Inp value={f.lotPrefix} onChange={v => sf('lotPrefix', v)} placeholder="4.1/P/26/" />
                </div>
                <div>
                  <Lbl>Pierwszy numer seryjny</Lbl>
                  <Inp value={f.lotSerial} onChange={v => sf('lotSerial', v.replace(/\D/g, ''))} placeholder="171" />
                </div>
                <div>
                  <Lbl>Kraj pochodzenia</Lbl>
                  <Sel value={f.origin} onChange={v => sf('origin', v)} options={[{ value: 'Poland', label: 'Poland' }, { value: 'Polska', label: 'Polska' }]} />
                </div>
              </div>

              {!f.manualLots && autoLots.length > 0 && (
                <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      ✓ {autoLots.length} partii · {totalKg.toLocaleString()} kg łącznie
                    </span>
                    <button onClick={() => setF(p => ({ ...p, manualLots: true, customLots: autoLots.map(l => ({ ...l })) }))}
                      style={{ fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>
                      Edytuj ręcznie
                    </button>
                  </div>
                  <LotGrid lots={autoLots} />
                </div>
              )}
              {!f.manualLots && !autoLots.length && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '6px 0' }}>
                  ← Wpisz numer seryjny pierwszej partii aby wygenerować tabelę LOT
                </div>
              )}

              {f.manualLots && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Tryb ręczny · {f.customLots.length} partii</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setF(p => ({ ...p, manualLots: false }))} style={{ padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>← Automatyczny</button>
                      <button onClick={() => setF(p => ({ ...p, customLots: [...p.customLots, { lot: p.lotPrefix, qty: kgPerLot }] }))} style={{ padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>+ Partia</button>
                    </div>
                  </div>
                  {f.customLots.map((lot, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 24, textAlign: 'right' }}>{i + 1}.</span>
                      <Inp value={lot.lot} onChange={v => { const c = [...f.customLots]; c[i] = { ...c[i], lot: v }; sf('customLots', c) }} style={{ flex: 2 }} />
                      <Inp type="number" value={lot.qty} onChange={v => { const c = [...f.customLots]; c[i] = { ...c[i], qty: Number(v) }; sf('customLots', c) }} style={{ width: 90 }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>kg</span>
                      <button onClick={() => sf('customLots', f.customLots.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', fontSize: 16 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Sec>

            <Sec label="Daty i transport">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <Lbl>Data załadunku</Lbl>
                  <Inp type="date" value={f.dateLoading} onChange={v => sf('dateLoading', v)} />
                </div>
                <div>
                  <Lbl>Data produkcji <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(domyślnie dzień przed)</span></Lbl>
                  <Inp type="date" value={f.dateProduction || dateProd} onChange={v => sf('dateProduction', v)} />
                </div>
                <div>
                  <Lbl>Numer ciężarówki</Lbl>
                  <Inp value={f.truckNumber} onChange={v => sf('truckNumber', v)} placeholder="MGK015/LN057" />
                </div>
              </div>
            </Sec>

            {/* Summary */}
            <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                ['Produkt', `${f.productCode} · ${product.name}`],
                ['Palety', numPallets],
                ['Kg netto', `${totalKg.toLocaleString()} kg`],
                ['Kg brutto', `${grossKg.toLocaleString()} kg`],
                ['Termin ważności', fmtD(bestBefore)],
                ['Nr certyfikatu', `${nextCounter}/2026/EN`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>

            {formErrors.length > 0 && (
              <div style={{ background: '#fcebeb', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {formErrors.map(e => <div key={e} style={{ fontSize: 12, color: '#a32d2d' }}>⚠ {e}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button disabled={formErrors.length > 0} onClick={openPreview} style={{
                padding: '10px 28px',
                background: formErrors.length > 0 ? '#ccc' : '#0f6e56',
                color: '#fff', border: 'none', borderRadius: 10,
                cursor: formErrors.length > 0 ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 500,
              }}>
                Podgląd i generuj dokumenty →
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: DATABASE ── */}
        {tab === 1 && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <Inp value={filterBuyer} onChange={setFilterBuyer} placeholder="Szukaj nabywcy..." style={{ width: 200 }} />
              <Sel value={filterProduct} onChange={setFilterProduct} options={[{ value: '', label: 'Wszystkie produkty' }, ...PRODUCTS.map(p => ({ value: p.code, label: p.code }))]} />
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-secondary)' }}>{filteredCerts.length} certyfikatów</div>
            </div>
            {loading ? <Spinner /> : filteredCerts.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Brak certyfikatów.</div>
              : filteredCerts.map(cert => (
                <CertRow key={cert.id} cert={cert}
                  onView={() => setPreview({ ...cert, _view: true })}
                  onSent={() => handleMarkSent(cert.id)}
                  onDelete={() => handleDelete(cert.id)} />
              ))
            }
          </div>
        )}

        {/* ── TAB 2: ARCHIVE ── */}
        {tab === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Importuj wcześniej wysłane certyfikaty</div>
              <button onClick={() => setArchOpen(v => !v)} style={{ padding: '7px 16px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                {archOpen ? 'Anuluj' : '+ Dodaj archiwalny'}
              </button>
            </div>

            {archOpen && (
              <Sec label="Dodaj certyfikat archiwalny" style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><Lbl>Nr certyfikatu *</Lbl><Inp value={arch.certNumber} onChange={v => sa('certNumber', v)} placeholder="94/2026/EN" /></div>
                  <div><Lbl>Nabywca *</Lbl><Combo value={arch.buyerName} options={buyers.map(b => b.name)} onChange={name => { const b = buyers.find(b => b.name === name); setArch(a => ({ ...a, buyerName: name, buyerAddress: b?.address || a.buyerAddress })) }} placeholder="Nazwa..." /></div>
                  <div><Lbl>Produkt</Lbl><Sel value={arch.productCode} onChange={v => setArch(a => ({ ...a, productCode: v, lotPrefix: `${v}/${yearShort()}/` }))} options={PRODUCTS.map(p => ({ value: p.code, label: `${p.code} — ${p.name}` }))} /></div>
                  <div><Lbl>Opakowanie</Lbl><Sel value={arch.packaging} onChange={v => sa('packaging', v)} options={PACKAGINGS.map(p => ({ value: p.value, label: p.label }))} /></div>
                  <div><Lbl>Liczba palet</Lbl><Inp type="number" min="1" value={arch.pallets} onChange={v => sa('pallets', v)} /></div>
                  <div><Lbl>Prefiks LOT</Lbl><Inp value={arch.lotPrefix} onChange={v => sa('lotPrefix', v)} /></div>
                  <div><Lbl>Pierwszy nr seryjny LOT *</Lbl><Inp value={arch.lotSerial} onChange={v => sa('lotSerial', v.replace(/\D/g, ''))} placeholder="171" /></div>
                  <div><Lbl>Nr ciężarówki</Lbl><Inp value={arch.truckNumber} onChange={v => sa('truckNumber', v)} /></div>
                  <div><Lbl>Data załadunku</Lbl><Inp type="date" value={arch.dateLoading} onChange={v => sa('dateLoading', v)} /></div>
                  <div><Lbl>Data wysłania (do archiwum)</Lbl><Inp type="date" value={arch.sentDate} onChange={v => sa('sentDate', v)} /></div>
                </div>
                {arch.lotSerial && (() => {
                  const ap = PACKAGINGS.find(p => p.value === arch.packaging) || PACKAGINGS[0]
                  const lots = generateLots(arch.lotPrefix, arch.lotSerial, Number(arch.pallets), ap.bagKg * ap.bagsPerPallet)
                  return lots.length > 0 && (
                    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Podgląd partii:</div>
                      <LotGrid lots={lots} />
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleArchiveSave} disabled={saving} style={{ padding: '8px 20px', background: saving ? '#ccc' : '#185fa5', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
                    {saving ? 'Zapisywanie...' : 'Zapisz w archiwum'}
                  </button>
                </div>
              </Sec>
            )}

            {loading ? <Spinner /> : certs.filter(c => c.status === 'archived' || c.status === 'sent').length === 0
              ? <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Brak certyfikatów archiwalnych.</div>
              : certs.filter(c => c.status === 'archived' || c.status === 'sent').map(cert => (
                <CertRow key={cert.id} cert={cert}
                  onView={() => setPreview({ ...cert, _view: true })}
                  onSent={() => handleMarkSent(cert.id)}
                  onDelete={() => handleDelete(cert.id)} />
              ))
            }
          </div>
        )}

        {/* ── TAB 3: BUYERS ── */}
        {tab === 3 && (
          <div>
            <Sec label="Dodaj / edytuj nabywcę" style={{ marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <div><Lbl>Nazwa firmy</Lbl><Inp value={newBuyerName} onChange={setNewBuyerName} placeholder="Nazwa nabywcy..." /></div>
                <div><Lbl>Adres</Lbl><Inp value={newBuyerAddr} onChange={setNewBuyerAddr} placeholder="Adres..." /></div>
                <button onClick={handleAddBuyer} style={{ padding: '8px 16px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  + Zapisz nabywcę
                </button>
              </div>
            </Sec>
            {loading ? <Spinner /> : buyers.length === 0
              ? <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Brak nabywców w bazie.</div>
              : buyers.map(b => (
                <div key={b.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 7 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{b.address}</div>
                  </div>
                  <button onClick={() => handleDeleteBuyer(b.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d', fontSize: 13 }}>Usuń</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
