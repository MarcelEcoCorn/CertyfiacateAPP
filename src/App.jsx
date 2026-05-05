import { useState, useEffect, useMemo, useRef } from 'react'
import {
  fetchCertificates, saveCertificate, updateCertificateStatus,
  deleteCertificate, fetchBuyers, saveBuyer, deleteBuyer, updateBuyer,
  fetchCurrentCounter, archiveCertificate,
  fetchProducts, saveProduct, deleteProduct, updateProduct,
  fetchPackagings, savePackaging, deletePackaging, updatePackaging,
} from './lib/supabase.js'
import { today, fmtD, addYear, yearShort, generateLots } from './lib/constants.js'
import { Inp, Sel, Lbl, Sec, Toggle, BuyerCombo, LotGrid, CertRow, Spinner, ErrorBanner, PageLayout } from './components/UI.jsx'
import Preview from './components/Preview.jsx'

export default function App() {
  const headerRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(90)

  useEffect(() => {
    if (!headerRef.current) return
    const obs = new ResizeObserver(() => setHeaderHeight(headerRef.current?.offsetHeight || 90))
    obs.observe(headerRef.current)
    setHeaderHeight(headerRef.current.offsetHeight)
    return () => obs.disconnect()
  }, [])

  const [tab, setTab] = useState(0)
  const [certs, setCerts] = useState([])
  const [buyers, setBuyers] = useState([])
  const [products, setProducts] = useState([])
  const [packagings, setPackagings] = useState([])
  const [nextCounter, setNextCounter] = useState('…')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const [filterCertNum, setFilterCertNum] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBuyer, setFilterBuyer] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [packFilter, setPackFilter] = useState('')
  const [packSort, setPackSort] = useState('name')

  async function loadAll() {
    setLoading(true); setError(null)
    try {
      const [certsData, buyersData, prodsData, packsData, counter] = await Promise.all([
        fetchCertificates(), fetchBuyers(), fetchProducts(), fetchPackagings(), fetchCurrentCounter(),
      ])
      setCerts(certsData); setBuyers(buyersData); setProducts(prodsData)
      setPackagings(packsData); setNextCounter(counter)
    } catch (e) { setError('Błąd połączenia: ' + e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const [lang, setLang] = useState('EN')
  const [docType, setDocType] = useState('both')
  const [f, setF] = useState({
    buyerName: '', buyerAddress: '', buyerId: null,
    productCode: '', packaging: '',
    pallets: 9, lotPrefix: '', lotSerial: '',
    manualLots: false, customLots: [],
    dateLoading: today(), dateProduction: '',
    truckNumber: '', origin: 'Poland',
  })

  useEffect(() => {
    if (products.length && !f.productCode) {
      const p = products[0]
      setF(prev => ({ ...prev, productCode: p.code, lotPrefix: `${p.code}/${yearShort()}/` }))
    }
  }, [products])

  useEffect(() => {
    if (packagings.length && !f.packaging) {
      setF(prev => ({ ...prev, packaging: packagings[0].value }))
    }
  }, [packagings])

  const availablePackagings = useMemo(() => {
    if (!f.buyerId) return packagings.filter(p => !p.buyerId)
    return packagings.filter(p => !p.buyerId || p.buyerId === f.buyerId)
  }, [packagings, f.buyerId])

  const packInfo = availablePackagings.find(p => p.value === f.packaging) || availablePackagings[0]
  const product = products.find(p => p.code === f.productCode) || products[0]
  const kgPerLot = packInfo ? packInfo.bagKg * packInfo.bagsPerPallet : 0
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
  function onProductChange(code) { setF(p => ({ ...p, productCode: code, lotPrefix: `${code}/${yearShort()}/` })) }

  const formErrors = useMemo(() => {
    const e = []
    if (!f.buyerName.trim()) e.push('Wybierz lub wpisz nabywcę')
    if (!f.manualLots && !f.lotSerial.trim()) e.push('Podaj numer seryjny pierwszej partii LOT (np. 171)')
    if (f.manualLots && f.customLots.some(l => !l.lot.trim())) e.push('Uzupełnij wszystkie numery partii')
    if (!f.truckNumber.trim()) e.push('Podaj numer ciężarówki')
    return e
  }, [f])

  function openPreview() {
    setPreview({
      buyer: f.buyerName, buyerAddress: f.buyerAddress,
      productCode: f.productCode, productName: product?.name || '',
      dateLoading: f.dateLoading, dateProduction: dateProd, bestBefore,
      packaging: packInfo?.label || f.packaging,
      origin: f.origin, truckNumber: f.truckNumber,
      lots: activeLots, totalKg, grossKg, pallets: numPallets, kgPerLot,
      lang, docType, status: 'saved',
    })
  }

  async function handleSave(doc) {
    setSaving(true); setError(null)
    try {
      if (doc.buyer && !buyers.find(b => b.name === doc.buyer))
        await saveBuyer({ name: doc.buyer, address: doc.buyerAddress || '' })
      const saved = await saveCertificate(doc)
      setCerts(c => [saved, ...c])
      setNextCounter(n => typeof n === 'number' ? n + 1 : n)
      setPreview(null); setTab(1)
      setF(p => ({ ...p, lotSerial: '', truckNumber: '', dateProduction: '', pallets: 9, manualLots: false, customLots: [] }))
      setBuyers(await fetchBuyers())
    } catch (e) { setError('Błąd zapisu: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleMarkSent(id) {
    try {
      const updated = await updateCertificateStatus(id, 'sent', { sent_date: today() })
      setCerts(c => c.map(x => x.id === id ? updated : x))
    } catch (e) { setError('Błąd: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Usunąć certyfikat?')) return
    try { await deleteCertificate(id); setCerts(c => c.filter(x => x.id !== id)) }
    catch (e) { setError('Błąd: ' + e.message) }
  }

  const [newBuyer, setNewBuyer] = useState({ name: '', address: '', nip: '', deliveryAddress: '' })
  const [editBuyer, setEditBuyer] = useState(null)
  function snb(k, v) { setNewBuyer(p => ({ ...p, [k]: v })) }
  function seb(k, v) { setEditBuyer(p => ({ ...p, [k]: v })) }

  async function handleAddBuyer() {
    if (!newBuyer.name.trim()) return
    try {
      const b = await saveBuyer(newBuyer)
      setBuyers(prev => [...prev.filter(x => x.name !== b.name), b].sort((a, b) => a.name.localeCompare(b.name)))
      setNewBuyer({ name: '', address: '', nip: '', deliveryAddress: '' })
    } catch (e) { setError('Błąd zapisu klienta: ' + e.message) }
  }

  async function handleUpdateBuyer() {
    if (!editBuyer?.name?.trim()) return
    try {
      const b = await updateBuyer(editBuyer.id, {
        name: editBuyer.name, address: editBuyer.address,
        nip: editBuyer.nip, deliveryAddress: editBuyer.delivery_address,
      })
      setBuyers(prev => prev.map(x => x.id === b.id ? b : x))
      setEditBuyer(null)
    } catch (e) { setError('Błąd edycji klienta: ' + e.message) }
  }

  async function handleDeleteBuyer(id) {
    if (!window.confirm('Usunąć klienta?')) return
    try { await deleteBuyer(id); setBuyers(b => b.filter(x => x.id !== id)) }
    catch (e) { setError('Błąd: ' + e.message) }
  }

  const [newProd, setNewProd] = useState({ code: '', nameEn: '', namePl: '' })
  const [editProd, setEditProd] = useState(null)
  function snp(k, v) { setNewProd(p => ({ ...p, [k]: v })) }
  function sep(k, v) { setEditProd(p => ({ ...p, [k]: v })) }

  async function handleAddProduct() {
    if (!newProd.code.trim() || !newProd.nameEn.trim() || !newProd.namePl.trim()) {
      setError('Uzupełnij kod, nazwę EN i nazwę PL'); return
    }
    try {
      const p = await saveProduct(newProd.code.trim(), newProd.nameEn.trim(), newProd.namePl.trim())
      setProducts(prev => [...prev.filter(x => x.id !== p.id), p].sort((a, b) => a.code.localeCompare(b.code)))
      setNewProd({ code: '', nameEn: '', namePl: '' })
    } catch (e) { setError('Błąd zapisu produktu: ' + e.message) }
  }

  async function handleUpdateProduct() {
    if (!editProd) return
    try {
      const p = await updateProduct(editProd.id, editProd.code, editProd.name, editProd.namePL)
      setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      setEditProd(null)
    } catch (e) { setError('Błąd edycji produktu: ' + e.message) }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('Usunąć produkt?')) return
    try { await deleteProduct(id); setProducts(p => p.filter(x => x.id !== id)) }
    catch (e) { setError('Błąd: ' + e.message) }
  }

  const [newPack, setNewPack] = useState({ namePl: '', nameEn: '', bagKg: '', bagsPerPallet: '', buyerId: '' })
  const [editPack, setEditPack] = useState(null)
  function snk(k, v) { setNewPack(p => ({ ...p, [k]: v })) }
  function sek(k, v) { setEditPack(p => ({ ...p, [k]: v })) }

  async function handleAddPackaging() {
    if (!newPack.namePl.trim() || !newPack.nameEn.trim() || !newPack.bagKg || !newPack.bagsPerPallet) {
      setError('Uzupełnij wszystkie pola opakowania'); return
    }
    try {
      const p = await savePackaging(newPack.namePl.trim(), newPack.nameEn.trim(), Number(newPack.bagKg), Number(newPack.bagsPerPallet), newPack.buyerId || null)
      setPackagings(prev => [...prev, p])
      setNewPack({ namePl: '', nameEn: '', bagKg: '', bagsPerPallet: '', buyerId: '' })
    } catch (e) { setError('Błąd zapisu opakowania: ' + e.message) }
  }

  async function handleUpdatePackaging() {
    if (!editPack) return
    try {
      const p = await updatePackaging(editPack.id, editPack.labelPL, editPack.label, Number(editPack.bagKg), Number(editPack.bagsPerPallet), editPack.buyerId || null)
      setPackagings(prev => prev.map(x => x.id === p.id ? p : x))
      setEditPack(null)
    } catch (e) { setError('Błąd edycji opakowania: ' + e.message) }
  }

  async function handleDeletePackaging(id) {
    if (!window.confirm('Usunąć opakowanie?')) return
    try { await deletePackaging(id); setPackagings(p => p.filter(x => x.id !== id)) }
    catch (e) { setError('Błąd: ' + e.message) }
  }

  const [archOpen, setArchOpen] = useState(false)
  const [arch, setArch] = useState({
    certNumber: '', buyerName: '', buyerAddress: '', productCode: '',
    packaging: '', pallets: 2, lotPrefix: '', lotSerial: '',
    dateLoading: today(), dateProduction: '', truckNumber: '', sentDate: today(),
  })
  function sa(k, v) { setArch(p => ({ ...p, [k]: v })) }

  async function handleArchiveSave() {
    if (!arch.certNumber.trim() || !arch.buyerName.trim() || !arch.lotSerial.trim()) {
      setError('Uzupełnij: numer certyfikatu, nabywcę i numer LOT'); return
    }
    const ap = packagings.find(p => p.value === arch.packaging) || packagings[0]
    if (!ap) { setError('Wybierz opakowanie'); return }
    const akpL = ap.bagKg * ap.bagsPerPallet
    const alots = generateLots(arch.lotPrefix, arch.lotSerial, Number(arch.pallets), akpL)
    const aprod = arch.dateProduction || (() => {
      const d = new Date(arch.dateLoading); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
    })()
    const archProd = products.find(p => p.code === arch.productCode) || products[0]
    const doc = {
      certNumber: arch.certNumber, buyer: arch.buyerName, buyerAddress: arch.buyerAddress,
      productCode: arch.productCode || archProd?.code || '', productName: archProd?.name || '',
      dateLoading: arch.dateLoading, dateProduction: aprod, bestBefore: addYear(aprod),
      packaging: ap.label, origin: 'Poland', truckNumber: arch.truckNumber,
      lots: alots, totalKg: Number(arch.pallets) * akpL,
      grossKg: Math.round(Number(arch.pallets) * akpL * 1.031),
      pallets: Number(arch.pallets), kgPerLot: akpL,
      lang: 'EN', docType: 'both', status: 'archived', sentDate: arch.sentDate,
    }
    setSaving(true)
    try {
      const saved = await archiveCertificate(doc)
      setCerts(c => [saved, ...c]); setArchOpen(false)
      setArch(p => ({ ...p, certNumber: '', lotSerial: '', truckNumber: '' }))
    } catch (e) { setError('Błąd archiwizacji: ' + e.message) }
    finally { setSaving(false) }
  }

  const filteredCerts = certs.filter(c =>
    (!filterCertNum || c.certNumber?.toLowerCase().includes(filterCertNum.toLowerCase())) &&
    (!filterStatus || c.status === filterStatus) &&
    (!filterBuyer || c.buyer?.toLowerCase().includes(filterBuyer.toLowerCase())) &&
    (!filterProduct || c.productCode === filterProduct)
  )

  const filteredPackagings = useMemo(() => {
    let list = [...packagings]
    if (packFilter) {
      const q = packFilter.toLowerCase()
      list = list.filter(p => p.label?.toLowerCase().includes(q) || p.labelPL?.toLowerCase().includes(q) || p.buyerName?.toLowerCase().includes(q))
    }
    if (packSort === 'name') list.sort((a, b) => (a.labelPL || a.label || '').localeCompare(b.labelPL || b.label || ''))
    if (packSort === 'kg') list.sort((a, b) => a.bagKg - b.bagKg)
    if (packSort === 'client') list.sort((a, b) => (a.buyerName || '').localeCompare(b.buyerName || ''))
    return list
  }, [packagings, packFilter, packSort])

  const buyerOptions = [
    { value: '', label: '— Dla wszystkich klientów —' },
    ...buyers.map(b => ({ value: String(b.id), label: b.name }))
  ]

  if (preview) return <Preview doc={preview} onSave={handleSave} onBack={() => setPreview(null)} saving={saving} />

  const tabStyle = i => ({
    padding: '7px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 13, fontWeight: tab === i ? 500 : 400,
    color: tab === i ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    borderBottom: tab === i ? '2px solid var(--color-text-primary)' : '2px solid transparent',
    whiteSpace: 'nowrap',
  })

  const editBoxStyle = {
    background: 'var(--color-background-secondary)',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 10, padding: '12px 14px', marginBottom: 8,
  }

  // Wysokość dostępna dla scrollowanej listy
  const listHeight = `calc(100vh - ${headerHeight}px - 20px)`

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 900, margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER APLIKACJI — fixed na samej górze ── */}
      <div ref={headerRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--color-background-primary)',
        borderBottom: '1px solid var(--color-border-tertiary)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: 1 }}>🌿 ECOCORN</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>System certyfikatów jakości · Eco-corn Sp. z o.o.</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Następny nr certyfikatu</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{nextCounter}/2026/EN</div>
            </div>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            {['Nowy dokument', 'Baza certyfikatów', 'Archiwum', 'Klienci', 'Produkty', 'Opakowania'].map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={tabStyle(i)}>{t}</button>
            ))}
            <button onClick={loadAll} style={{ marginLeft: 'auto', padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              ↺ Odśwież
            </button>
          </div>
        </div>
      </div>

      {/* ── STREFA TREŚCI — zaczyna się dokładnie pod headerem ── */}
      <div style={{ marginTop: headerHeight, display: 'flex', flexDirection: 'column', height: listHeight, overflow: 'hidden' }}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} style={{ margin: '12px 20px 0' }} />

        {/* ── TAB 0: NOWY DOKUMENT — cały scrollowany ── */}
        {tab === 0 && (
          <div style={{ overflowY: 'auto', padding: '18px 20px 40px' }}>
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
                <Lbl>Wybierz klienta z bazy <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(lub wpisz ręcznie)</span></Lbl>
                <BuyerCombo value={f.buyerName} buyers={buyers}
                  onSelect={b => b
                    ? setF(p => ({ ...p, buyerName: b.name, buyerAddress: b.delivery_address || b.address || '', buyerId: b.id }))
                    : setF(p => ({ ...p, buyerName: '', buyerAddress: '', buyerId: null }))
                  } placeholder="Wybierz klienta z bazy..." />
                <div style={{ marginTop: 8 }}>
                  <Lbl>Adres na dokumencie <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(auto, możesz edytować)</span></Lbl>
                  <Inp value={f.buyerAddress} onChange={v => sf('buyerAddress', v)} placeholder="Adres widoczny na certyfikacie..." />
                </div>
              </Sec>

              <Sec label="Produkt i opakowanie">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <Lbl>Produkt</Lbl>
                    <Sel value={f.productCode} onChange={onProductChange} options={products.map(p => ({ value: p.code, label: `${p.code} — ${p.name}` }))} />
                  </div>
                  <div>
                    <Lbl>Opakowanie <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>→ {kgPerLot.toLocaleString()} kg/paleta</span></Lbl>
                    <Sel value={f.packaging} onChange={v => sf('packaging', v)}
                      options={availablePackagings.map(p => ({ value: p.value, label: `${p.labelPL || p.label}${p.buyerName ? ` (${p.buyerName})` : ''} → ${(p.bagKg * p.bagsPerPallet).toLocaleString()} kg/paleta` }))} />
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
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>✓ {autoLots.length} partii · {totalKg.toLocaleString()} kg łącznie</span>
                      <button onClick={() => setF(p => ({ ...p, manualLots: true, customLots: autoLots.map(l => ({ ...l })) }))} style={{ fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Edytuj ręcznie</button>
                    </div>
                    <LotGrid lots={autoLots} />
                  </div>
                )}
                {!f.manualLots && !autoLots.length && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '6px 0' }}>← Wpisz numer seryjny pierwszej partii aby wygenerować tabelę LOT</div>
                )}
                {f.manualLots && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Tryb ręczny · {f.customLots.length} partii</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setF(p => ({ ...p, manualLots: false }))} style={{ padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>← Automatyczny</button>
                        <button onClick={() => setF(p => ({ ...p, customLots: [...p.customLots, { lot: f.lotPrefix, qty: kgPerLot }] }))} style={{ padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>+ Partia</button>
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
                  <div><Lbl>Data załadunku</Lbl><Inp type="date" value={f.dateLoading} onChange={v => sf('dateLoading', v)} /></div>
                  <div>
                    <Lbl>Data produkcji <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(domyślnie dzień przed)</span></Lbl>
                    <Inp type="date" value={f.dateProduction || dateProd} onChange={v => sf('dateProduction', v)} />
                  </div>
                  <div><Lbl>Numer ciężarówki</Lbl><Inp value={f.truckNumber} onChange={v => sf('truckNumber', v)} placeholder="MGK015/LN057" /></div>
                </div>
              </Sec>

              <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  ['Produkt', product ? `${product.code} · ${product.name}` : '—'],
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
                <button disabled={formErrors.length > 0 || loading} onClick={openPreview} style={{
                  padding: '10px 28px', background: formErrors.length > 0 || loading ? '#ccc' : '#0f6e56',
                  color: '#fff', border: 'none', borderRadius: 10,
                  cursor: formErrors.length > 0 || loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500,
                }}>Podgląd i generuj dokumenty →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 1: BAZA CERTYFIKATÓW ── */}
        {tab === 1 && (
          <PageLayout topZone={
            <div style={{ padding: '12px 20px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px 160px', gap: 10, marginBottom: 10 }}>
                <div><Lbl>Nr certyfikatu</Lbl><Inp value={filterCertNum} onChange={setFilterCertNum} placeholder="np. 96/2026" /></div>
                <div><Lbl>Klient</Lbl><Inp value={filterBuyer} onChange={setFilterBuyer} placeholder="Szukaj klienta..." /></div>
                <div><Lbl>Status</Lbl>
                  <Sel value={filterStatus} onChange={setFilterStatus} options={[
                    { value: '', label: 'Wszystkie statusy' }, { value: 'saved', label: 'Zapisany' },
                    { value: 'sent', label: 'Wysłany' }, { value: 'archived', label: 'Archiwum' },
                  ]} />
                </div>
                <div><Lbl>Produkt</Lbl>
                  <Sel value={filterProduct} onChange={setFilterProduct} options={[{ value: '', label: 'Wszystkie' }, ...products.map(p => ({ value: p.code, label: p.code }))]} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{filteredCerts.length} certyfikatów</span>
                {(filterCertNum || filterBuyer || filterStatus || filterProduct) && (
                  <button onClick={() => { setFilterCertNum(''); setFilterBuyer(''); setFilterStatus(''); setFilterProduct('') }}
                    style={{ fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#a32d2d' }}>✕ Wyczyść filtry</button>
                )}
              </div>
            </div>
          }>
            <div style={{ padding: '0 20px 40px' }}>
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
          </PageLayout>
        )}

        {/* ── TAB 2: ARCHIWUM ── */}
        {tab === 2 && (
          <PageLayout topZone={
            <div style={{ padding: '12px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Importuj wcześniej wysłane certyfikaty</div>
                <button onClick={() => setArchOpen(v => !v)} style={{ padding: '7px 16px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                  {archOpen ? 'Anuluj' : '+ Dodaj archiwalny'}
                </button>
              </div>
              {archOpen && (
                <Sec label="Dodaj certyfikat archiwalny" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><Lbl>Nr certyfikatu *</Lbl><Inp value={arch.certNumber} onChange={v => sa('certNumber', v)} placeholder="94/2026/EN" /></div>
                    <div><Lbl>Nabywca *</Lbl>
                      <BuyerCombo value={arch.buyerName} buyers={buyers}
                        onSelect={b => b ? setArch(a => ({ ...a, buyerName: b.name, buyerAddress: b.delivery_address || b.address || '' })) : setArch(a => ({ ...a, buyerName: '', buyerAddress: '' }))}
                        placeholder="Wybierz nabywcę..." />
                    </div>
                    <div><Lbl>Produkt</Lbl><Sel value={arch.productCode || (products[0]?.code || '')} onChange={v => sa('productCode', v)} options={products.map(p => ({ value: p.code, label: `${p.code} — ${p.name}` }))} /></div>
                    <div><Lbl>Opakowanie</Lbl><Sel value={arch.packaging || (packagings[0]?.value || '')} onChange={v => sa('packaging', v)} options={packagings.map(p => ({ value: p.value, label: p.label }))} /></div>
                    <div><Lbl>Liczba palet</Lbl><Inp type="number" min="1" value={arch.pallets} onChange={v => sa('pallets', v)} /></div>
                    <div><Lbl>Prefiks LOT</Lbl><Inp value={arch.lotPrefix} onChange={v => sa('lotPrefix', v)} /></div>
                    <div><Lbl>Pierwszy nr seryjny LOT *</Lbl><Inp value={arch.lotSerial} onChange={v => sa('lotSerial', v.replace(/\D/g, ''))} placeholder="171" /></div>
                    <div><Lbl>Nr ciężarówki</Lbl><Inp value={arch.truckNumber} onChange={v => sa('truckNumber', v)} /></div>
                    <div><Lbl>Data załadunku</Lbl><Inp type="date" value={arch.dateLoading} onChange={v => sa('dateLoading', v)} /></div>
                    <div><Lbl>Data wysłania</Lbl><Inp type="date" value={arch.sentDate} onChange={v => sa('sentDate', v)} /></div>
                  </div>
                  {arch.lotSerial && (() => {
                    const ap = packagings.find(p => p.value === arch.packaging) || packagings[0]
                    if (!ap) return null
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
            </div>
          }>
            <div style={{ padding: '0 20px 40px' }}>
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
          </PageLayout>
        )}

        {/* ── TAB 3: KLIENCI ── */}
        {tab === 3 && (
          <PageLayout topZone={
            <div style={{ padding: '12px 20px 0' }}>
              <Sec label="Dodaj nowego klienta">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><Lbl>Nazwa firmy *</Lbl><Inp value={newBuyer.name} onChange={v => snb('name', v)} placeholder="Nazwa klienta..." /></div>
                  <div><Lbl>NIP</Lbl><Inp value={newBuyer.nip} onChange={v => snb('nip', v)} placeholder="000-000-00-00" /></div>
                  <div><Lbl>Adres siedziby</Lbl><Inp value={newBuyer.address} onChange={v => snb('address', v)} placeholder="ul. Przykładowa 1, 00-000 Miasto" /></div>
                  <div><Lbl>Adres dostawy</Lbl><Inp value={newBuyer.deliveryAddress} onChange={v => snb('deliveryAddress', v)} placeholder="ul. Magazynowa 5, 00-000 Miasto" /></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleAddBuyer} style={{ padding: '8px 20px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>+ Zapisz klienta</button>
                </div>
              </Sec>
            </div>
          }>
            <div style={{ padding: '0 20px 40px' }}>
              {loading ? <Spinner /> : buyers.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Brak klientów.</div>
                : buyers.map(b => (
                  <div key={b.id}>
                    {editBuyer?.id === b.id ? (
                      <div style={editBoxStyle}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edycja klienta</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div><Lbl>Nazwa firmy *</Lbl><Inp value={editBuyer.name} onChange={v => seb('name', v)} /></div>
                          <div><Lbl>NIP</Lbl><Inp value={editBuyer.nip || ''} onChange={v => seb('nip', v)} /></div>
                          <div><Lbl>Adres siedziby</Lbl><Inp value={editBuyer.address || ''} onChange={v => seb('address', v)} /></div>
                          <div><Lbl>Adres dostawy</Lbl><Inp value={editBuyer.delivery_address || ''} onChange={v => seb('delivery_address', v)} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditBuyer(null)} style={{ padding: '6px 14px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Anuluj</button>
                          <button onClick={handleUpdateBuyer} style={{ padding: '6px 16px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Zapisz zmiany</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 7 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{b.name}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
                            {b.nip && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>🏷 NIP: {b.nip}</div>}
                            {b.address && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>📍 {b.address}</div>}
                            {b.delivery_address && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>🚚 {b.delivery_address}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setEditBuyer({ ...b })} style={{ padding: '5px 11px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12 }}>Edytuj</button>
                          <button onClick={() => handleDeleteBuyer(b.id)} style={{ padding: '5px 11px', border: '0.5px solid #f09595', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#a32d2d' }}>Usuń</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </PageLayout>
        )}

        {/* ── TAB 4: PRODUKTY ── */}
        {tab === 4 && (
          <PageLayout topZone={
            <div style={{ padding: '12px 20px 0' }}>
              <Sec label="Dodaj nowy produkt">
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><Lbl>Kod produktu *</Lbl><Inp value={newProd.code} onChange={v => snp('code', v)} placeholder="4.1/P" /></div>
                  <div><Lbl>Nazwa EN *</Lbl><Inp value={newProd.nameEn} onChange={v => snp('nameEn', v)} placeholder="Dried Potato Powder" /></div>
                  <div><Lbl>Nazwa PL *</Lbl><Inp value={newProd.namePl} onChange={v => snp('namePl', v)} placeholder="Suszone Puree Ziemniaczane" /></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleAddProduct} style={{ padding: '8px 20px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>+ Zapisz produkt</button>
                </div>
              </Sec>
            </div>
          }>
            <div style={{ padding: '0 20px 40px' }}>
              {loading ? <Spinner /> : products.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Brak produktów.</div>
                : products.map(p => (
                  <div key={p.id}>
                    {editProd?.id === p.id ? (
                      <div style={editBoxStyle}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edycja produktu</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div><Lbl>Kod *</Lbl><Inp value={editProd.code} onChange={v => sep('code', v)} /></div>
                          <div><Lbl>Nazwa EN *</Lbl><Inp value={editProd.name} onChange={v => sep('name', v)} /></div>
                          <div><Lbl>Nazwa PL *</Lbl><Inp value={editProd.namePL} onChange={v => sep('namePL', v)} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditProd(null)} style={{ padding: '6px 14px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Anuluj</button>
                          <button onClick={handleUpdateProduct} style={{ padding: '6px 16px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Zapisz zmiany</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 7 }}>
                        <div style={{ background: '#e1f5ee', color: '#085041', fontWeight: 500, fontSize: 13, padding: '4px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>{p.code}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.namePL}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditProd({ ...p })} style={{ padding: '5px 11px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12 }}>Edytuj</button>
                          <button onClick={() => handleDeleteProduct(p.id)} style={{ padding: '5px 11px', border: '0.5px solid #f09595', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#a32d2d' }}>Usuń</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </PageLayout>
        )}

        {/* ── TAB 5: OPAKOWANIA ── */}
        {tab === 5 && (
          <PageLayout topZone={
            <div style={{ padding: '12px 20px 0' }}>
              <Sec label="Dodaj nowe opakowanie">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px', gap: 10, marginBottom: 10 }}>
                  <div><Lbl>Nazwa PL *</Lbl><Inp value={newPack.namePl} onChange={v => snk('namePl', v)} placeholder="Worek papierowy 25kg" /></div>
                  <div><Lbl>Nazwa EN *</Lbl><Inp value={newPack.nameEn} onChange={v => snk('nameEn', v)} placeholder="Papper Bag 25kg" /></div>
                  <div><Lbl>Waga szt. (kg) *</Lbl><Inp type="number" min="1" value={newPack.bagKg} onChange={v => snk('bagKg', v)} placeholder="25" /></div>
                  <div><Lbl>Szt./paleta *</Lbl><Inp type="number" min="1" value={newPack.bagsPerPallet} onChange={v => snk('bagsPerPallet', v)} placeholder="40" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    <Lbl>Przypisz do klienta <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(opcjonalne — puste = dla wszystkich)</span></Lbl>
                    <Sel value={newPack.buyerId} onChange={v => snk('buyerId', v)} options={buyerOptions} />
                  </div>
                  <div>
                    {newPack.bagKg && newPack.bagsPerPallet && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                        → {(Number(newPack.bagKg) * Number(newPack.bagsPerPallet)).toLocaleString()} kg / paleta
                      </div>
                    )}
                    <button onClick={handleAddPackaging} style={{ padding: '8px 20px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>+ Zapisz opakowanie</button>
                  </div>
                </div>
              </Sec>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}><Inp value={packFilter} onChange={setPackFilter} placeholder="🔍 Szukaj opakowania..." /></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['name', 'A–Z nazwa'], ['kg', 'Waga ↑'], ['client', 'Klient']].map(([val, lbl]) => (
                    <button key={val} onClick={() => setPackSort(val)} style={{
                      padding: '6px 12px', border: '0.5px solid', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                      borderColor: packSort === val ? '#185fa5' : 'var(--color-border-tertiary)',
                      background: packSort === val ? '#e6f1fb' : 'transparent',
                      color: packSort === val ? '#042c53' : 'var(--color-text-secondary)',
                    }}>{lbl}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{filteredPackagings.length} opakowań</div>
              </div>
            </div>
          }>
            <div style={{ padding: '0 20px 40px' }}>
              {loading ? <Spinner /> : filteredPackagings.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{packFilter ? 'Brak wyników.' : 'Brak opakowań.'}</div>
                : filteredPackagings.map(p => (
                  <div key={p.id}>
                    {editPack?.id === p.id ? (
                      <div style={editBoxStyle}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edycja opakowania</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px', gap: 10, marginBottom: 10 }}>
                          <div><Lbl>Nazwa PL *</Lbl><Inp value={editPack.labelPL} onChange={v => sek('labelPL', v)} /></div>
                          <div><Lbl>Nazwa EN *</Lbl><Inp value={editPack.label} onChange={v => sek('label', v)} /></div>
                          <div><Lbl>Waga szt. (kg)</Lbl><Inp type="number" value={editPack.bagKg} onChange={v => sek('bagKg', v)} /></div>
                          <div><Lbl>Szt./paleta</Lbl><Inp type="number" value={editPack.bagsPerPallet} onChange={v => sek('bagsPerPallet', v)} /></div>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <Lbl>Przypisz do klienta <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>(puste = dla wszystkich)</span></Lbl>
                          <Sel value={editPack.buyerId ? String(editPack.buyerId) : ''} onChange={v => sek('buyerId', v || null)} options={buyerOptions} />
                        </div>
                        {editPack.bagKg && editPack.bagsPerPallet && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                            → {(Number(editPack.bagKg) * Number(editPack.bagsPerPallet)).toLocaleString()} kg / paleta
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditPack(null)} style={{ padding: '6px 14px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Anuluj</button>
                          <button onClick={handleUpdatePackaging} style={{ padding: '6px 16px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Zapisz zmiany</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 7 }}>
                        <div style={{ background: '#e6f1fb', color: '#042c53', fontWeight: 500, fontSize: 13, padding: '4px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>{p.label}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{p.labelPL}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                            <span>{p.bagKg} kg/szt</span><span>·</span>
                            <span>{p.bagsPerPallet} szt/paleta</span><span>·</span>
                            <strong>{(p.bagKg * p.bagsPerPallet).toLocaleString()} kg/paleta</strong>
                            {p.buyerName
                              ? <span style={{ background: '#fff3cd', color: '#856404', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>👤 {p.buyerName}</span>
                              : <span style={{ background: '#e1f5ee', color: '#085041', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>🌐 Wszyscy klienci</span>
                            }
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: 8 }}>
                          <div style={{ fontSize: 20, fontWeight: 500 }}>{(p.bagKg * p.bagsPerPallet).toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>kg / paleta</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditPack({ ...p })} style={{ padding: '5px 11px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12 }}>Edytuj</button>
                          <button onClick={() => handleDeletePackaging(p.id)} style={{ padding: '5px 11px', border: '0.5px solid #f09595', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#a32d2d' }}>Usuń</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </PageLayout>
        )}

      </div>
    </div>
  )
}
