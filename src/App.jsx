import { useState, useEffect, useMemo, useRef } from 'react'
import {
  fetchCertificates, saveCertificate, updateCertificate, updateCertificateStatus,
  deleteCertificate, fetchBuyers, saveBuyer, deleteBuyer, updateBuyer,
  fetchCurrentCounter, archiveCertificate,
  fetchProducts, saveProduct, deleteProduct, updateProduct,
  fetchPackagings, savePackaging, deletePackaging, updatePackaging,
} from './lib/supabase.js'
import { today, fmtD, addDays, yearShort, generateLots } from './lib/constants.js'
import { Inp, Sel, Lbl, Sec, Toggle, BuyerCombo, LotGrid, CertRow, Spinner, ErrorBanner, PageLayout, ImportModal } from './components/UI.jsx'
import Preview from './components/Preview.jsx'
import EditCertModal from './components/EditCertModal.jsx'

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
  const [editCert, setEditCert] = useState(null)
  const [importModal, setImportModal] = useState(null)

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

  // ── Form ──
  const [lang, setLang] = useState('EN')
  const [docType, setDocType] = useState('qc')
  const [f, setF] = useState({
    buyerName: '', buyerAddress: '', buyerId: null,
    productCode: '', packaging: '',
    pallets: 9, lotPrefix: '', lotNumber: '',
    manualLots: false, customLots: [],
    dateLoading: today(), dateProduction: '',
    bestBeforeOverride: '',
    truckNumber: '', origin: 'Poland',
    notes: '',
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

  const dateProd = f.dateProduction || (() => {
    const d = new Date(f.dateLoading); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
  })()

  const bestBefore = f.bestBeforeOverride || addDays(dateProd, 364)

  const autoLots = useMemo(
    () => generateLots(f.lotPrefix, f.lotNumber, numPallets, kgPerLot),
    [f.lotPrefix, f.lotNumber, numPallets, kgPerLot]
  )
  const activeLots = f.manualLots ? f.customLots : autoLots

  function sf(k, v) { setF(p => ({ ...p, [k]: v })) }
  function onProductChange(code) { setF(p => ({ ...p, productCode: code, lotPrefix: `${code}/${yearShort()}/` })) }

  const formErrors = useMemo(() => {
    const e = []
    if (!f.buyerName.trim()) e.push('Wybierz lub wpisz nabywcę')
    if (!f.manualLots && !f.lotNumber.trim()) e.push('Podaj numer partii LOT (np. 171)')
    if (f.manualLots && f.customLots.some(l => !l.lot.trim())) e.push('Uzupełnij wszystkie numery partii')
    return e
  }, [f])

  function openPreview() {
    setPreview({
      buyer: f.buyerName, buyerAddress: f.buyerAddress,
      productCode: f.productCode, productName: product?.name || '',
      dateLoading: f.dateLoading, dateProduction: dateProd, bestBefore,
      packaging: packInfo?.label || f.packaging,
      origin: f.origin,
      lots: activeLots, totalKg, pallets: numPallets, kgPerLot,
      lang, docType, status: 'saved',
      notes: f.notes,
    })
  }

  async function handleSave(doc) {
    setSaving(true); setError(null)
    try {
      if (doc.buyer && !buyers.find(b => b.name === doc.buyer))
        await saveBuyer({ name: doc.buyer, address: doc.buyerAddress || '' })
      const saved = await saveCertificate(doc)
      setCerts(c => [saved, ...c])
      const newCounter = await fetchCurrentCounter()
      setNextCounter(newCounter)
      setPreview(null); setTab(1)
      setF(p => ({ ...p, lotNumber: '', truckNumber: '', dateProduction: '', bestBeforeOverride: '', pallets: 9, manualLots: false, customLots: [], notes: '' }))
      setBuyers(await fetchBuyers())
    } catch (e) { setError('Błąd zapisu: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleUpdateCert(id, doc) {
    setSaving(true); setError(null)
    try {
      const updated = await updateCertificate(id, doc)
      setCerts(c => c.map(x => x.id === id ? updated : x))
      setEditCert(null)
    } catch (e) { setError('Błąd edycji: ' + e.message) }
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

  // ── Buyers ──
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
    } catch (e) { setError('Błąd: ' + e.message) }
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
    } catch (e) { setError('Błąd: ' + e.message) }
  }

  async function handleDeleteBuyer(id) {
    if (!window.confirm('Usunąć klienta?')) return
    try { await deleteBuyer(id); setBuyers(b => b.filter(x => x.id !== id)) }
    catch (e) { setError('Błąd: ' + e.message) }
  }

  async function handleImportBuyers(rows) {
    let ok = 0
    for (const r of rows) {
      if (!r.name?.trim()) continue
      try {
        const b = await saveBuyer({ name: r.name.trim(), address: r.address || '', nip: r.nip || '', deliveryAddress: r.deliveryAddress || '' })
        setBuyers(prev => { const ex = prev.find(x => x.id === b.id); return ex ? prev.map(x => x.id === b.id ? b : x) : [...prev, b] })
        ok++
      } catch {}
    }
    setBuyers(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)))
    alert(`Zaimportowano ${ok} klientów`)
  }

  // ── Products ──
  const [newProd, setNewProd] = useState({ code: '', nameEn: '', namePl: '' })
  const [editProd, setEditProd] = useState(null)
  function snp(k, v) { setNewProd(p => ({ ...p, [k]: v })) }
  function sep(k, v) { setEditProd(p => ({ ...p, [k]: v })) }

  async function handleAddProduct() {
    if (!newProd.code.trim() || !newProd.nameEn.trim() || !newProd.namePl.trim()) { setError('Uzupełnij kod, nazwę EN i PL'); return }
    try {
      const p = await saveProduct(newProd.code.trim(), newProd.nameEn.trim(), newProd.namePl.trim())
      setProducts(prev => [...prev.filter(x => x.id !== p.id), p].sort((a, b) => a.code.localeCompare(b.code)))
      setNewProd({ code: '', nameEn: '', namePl: '' })
    } catch (e) { setError('Błąd: ' + e.message) }
  }

  async function handleUpdateProduct() {
    if (!editProd) return
    try {
      const p = await updateProduct(editProd.id, editProd.code, editProd.name, editProd.namePL)
      setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      setEditProd(null)
    } catch (e) { setError('Błąd: ' + e.message) }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('Usunąć produkt?')) return
    try { await deleteProduct(id); setProducts(p => p.filter(x => x.id !== id)) }
    catch (e) { setError('Błąd: ' + e.message) }
  }

  async function handleImportProducts(rows) {
    let ok = 0
    for (const r of rows) {
      if (!r.code?.trim()) continue
      try { await saveProduct(r.code.trim(), r.nameEn || '', r.namePl || ''); ok++ } catch {}
    }
    const fresh = await fetchProducts(); setProducts(fresh)
    alert(`Zaimportowano ${ok} produktów`)
  }

  // ── Packagings ──
  const [newPack, setNewPack] = useState({ namePl: '', nameEn: '', bagKg: '', bagsPerPallet: '', buyerId: '' })
  const [editPack, setEditPack] = useState(null)
  function snk(k, v) { setNewPack(p => ({ ...p, [k]: v })) }
  function sek(k, v) { setEditPack(p => ({ ...p, [k]: v })) }

  async function handleAddPackaging() {
    if (!newPack.namePl.trim() || !newPack.nameEn.trim() || !newPack.bagKg || !newPack.bagsPerPallet) { setError('Uzupełnij wszystkie pola'); return }
    try {
      const p = await savePackaging(newPack.namePl.trim(), newPack.nameEn.trim(), Number(newPack.bagKg), Number(newPack.bagsPerPallet), newPack.buyerId || null)
      setPackagings(prev => [...prev, p])
      setNewPa
