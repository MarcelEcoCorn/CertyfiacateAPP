import { useRef } from 'react'
import { COMPANY, PRODUCTS, EN, PL, fmtD } from '../lib/constants.js'

export default function Preview({ doc, onSave, onBack, saving }) {
  const printRef = useRef()
  const isView = doc._view
  const showQC = doc.docType === 'both' || doc.docType === 'qc'
  const showPL = doc.docType === 'both' || doc.docType === 'pl'
  const L = doc.lang === 'PL' ? PL : EN

  const lots = doc.lots || []
  const totalKg = doc.totalKg || lots.reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const productName = doc.productName || PRODUCTS.find(p => p.code === doc.productCode)?.name || ''

  // 17 rows × 2 columns — exact match to PDF template
  const rows = Array.from({ length: 17 }, (_, i) => ({
    nL: i + 1, lotL: lots[i]?.lot || '', qtyL: lots[i] ? `${lots[i].qty}kg` : '',
    nR: i + 18, lotR: lots[i + 17]?.lot || '', qtyR: lots[i + 17] ? `${lots[i + 17].qty}kg` : '',
  }))

  function printDoc() {
    const el = printRef.current
    if (!el) return
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Ecocorn — ${doc.certNumber}</title>
      <style>
        * { box-sizing: border-box }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; background: #fff }
        table { width: 100%; border-collapse: collapse }
        td { border: 1px solid #aaa; padding: 2px 5px; font-size: 10px }
        .b { font-weight: bold }
        @media print { body { margin: 0; padding: 10px } .no-print { display: none } }
      </style></head>
      <body>${el.innerHTML}</body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const ds = {
    fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000',
    background: '#fff', padding: 20, maxWidth: 700, margin: '0 auto',
    border: '1px solid #ddd', borderRadius: 6,
  }
  const rr = { display: 'flex', marginBottom: 2 }
  const kk = { minWidth: 165, fontWeight: 'bold', fontSize: 11 }
  const vv = { fontSize: 11 }

  const Hdr = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: 14, letterSpacing: 2 }}>ECOCORN</div>
        <div style={{ fontSize: 9, color: '#666', marginBottom: 4 }}>The future of potato</div>
        <div style={{ fontSize: 10 }}>
          {COMPANY.name}<br />
          {COMPANY.address}<br />
          Production plant: {COMPANY.plant}<br />
          Tel. {COMPANY.tel}
        </div>
      </div>
      <div style={{ fontSize: 10 }}>Przykona, {fmtD(doc.dateLoading)}</div>
    </div>
  )

  const LotTbl = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ border: '1px solid #aaa', padding: '1px 4px', width: 20, fontSize: 10 }}>{r.nL}.</td>
            <td style={{ border: '1px solid #aaa', padding: '1px 4px', width: 160, fontSize: 10 }}>{r.lotL}</td>
            <td style={{ border: '1px solid #aaa', padding: '1px 4px', width: 60, fontSize: 10 }}>{r.qtyL}</td>
            <td style={{ border: '1px solid #aaa', padding: '1px 4px', width: 20, fontSize: 10 }}>{r.nR}.</td>
            <td style={{ border: '1px solid #aaa', padding: '1px 4px', width: 160, fontSize: 10 }}>{r.lotR}</td>
            <td style={{ border: '1px solid #aaa', padding: '1px 4px', width: 60, fontSize: 10 }}>{r.qtyR}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const Sig = ({ name }) => (
    <div style={{ textAlign: 'right', marginTop: 24 }}>
      <div style={{ fontSize: 10, marginBottom: 16 }}>{name}</div>
      <div style={{ display: 'inline-block', border: '1px solid #999', padding: '4px 12px', fontSize: 10 }}>
        <div style={{ fontWeight: 'bold' }}>{COMPANY.name}</div>
        <div>44-144 Nieborowice, Mysia Góra 18</div>
        <div>NIP: {COMPANY.nip} · REGON: {COMPANY.regon}</div>
      </div>
    </div>
  )

  const fields = (arr) => arr.map(([k, v]) => (
    <div key={k} style={rr}><div style={kk}>{k}:</div><div style={vv}>{v}</div></div>
  ))

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Toolbar */}
      <div style={{
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        padding: '11px 20px', background: 'var(--color-background-primary)',
        display: 'flex', gap: 10, alignItems: 'center', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{ padding: '6px 14px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
          ← Wróć
        </button>
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          Nr {doc.certNumber || '—'} · {doc.buyer}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={printDoc} style={{ padding: '6px 14px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
            🖨 Drukuj / PDF
          </button>
          {!isView && (
            <button onClick={() => onSave(doc)} disabled={saving} style={{
              padding: '6px 18px', background: saving ? '#ccc' : '#0f6e56',
              color: '#fff', border: 'none', borderRadius: 7,
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              {saving ? 'Zapisywanie...' : 'Zapisz w bazie ✓'}
            </button>
          )}
        </div>
      </div>

      {/* Document preview */}
      <div style={{ padding: 20, overflow: 'auto' }}>
        <div ref={printRef}>

          {/* QUALITY CERTIFICATE */}
          {showQC && (
            <div style={ds}>
              <Hdr />
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 6, marginBottom: 12 }}>
                {L.qcTitle} No. {doc.certNumber || '___/2026/EN'}
              </div>
              {fields([
                [L.buyer, `${doc.buyer}${doc.buyerAddress ? ' ' + doc.buyerAddress : ''}`],
                [L.product, productName],
                [L.dateLoading, fmtD(doc.dateLoading)],
                [L.dateProd, fmtD(doc.dateProduction)],
                [L.bestBefore, fmtD(doc.bestBefore)],
                [L.qty, `${totalKg.toLocaleString()}kg`],
                [L.packaging, doc.packaging],
                [L.quality, 'According to quality specification'],
                [L.storage, 'Temperature max 30°C, Moisture max 75%'],
                [L.origin, doc.origin],
              ])}
              <div style={{ ...rr, marginTop: 4 }}>
                <div style={kk}>Ingredients:</div>
                <div style={vv}>
                  100% potato.<br />
                  {L.appearance}<br />
                  {L.smell}<br />
                  {L.moisture}<br />
                  {L.impurities}<br />
                  {L.organoleptic}
                </div>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: 11, margin: '10px 0 4px' }}>{L.lotNumber}:</div>
              <LotTbl />
              <div style={{ fontSize: 10, marginTop: 4 }}>{L.declaration}</div>
              <Sig name="Krzysztof Wroński Quality Department" />
            </div>
          )}

          {/* PACKING LIST */}
          {showPL && (
            <div style={{ ...ds, marginTop: showQC ? 20 : 0, borderTop: showQC ? '2px dashed #ccc' : 'none', paddingTop: showQC ? 20 : 0 }}>
              <Hdr />
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 6, marginBottom: 12 }}>
                {L.plTitle}
              </div>
              {fields([
                [L.recipient, `${doc.buyer}${doc.buyerAddress ? ' ' + doc.buyerAddress : ''}`],
                [L.dateLoading, fmtD(doc.dateLoading)],
                [L.truck, doc.truckNumber],
                [L.product, productName],
                [L.articleCode, doc.productCode],
                [L.bestBefore, fmtD(doc.bestBefore)],
              ])}
              <div style={{ fontWeight: 'bold', fontSize: 11, margin: '10px 0 4px' }}>{L.lotNumber}:</div>
              <LotTbl />
              <div style={{ fontSize: 10, marginTop: 4 }}>{L.declaration}</div>
              <div style={{ marginTop: 12 }}>
                {fields([
                  [L.packaging, doc.packaging],
                  ['Origin', doc.origin === 'Poland' ? 'Polska' : doc.origin],
                  [L.pallets, doc.pallets],
                  [L.bagWeight, `${doc.kgPerLot}`],
                  [L.netWeight, `${totalKg.toLocaleString()}KG`],
                  [L.grossWeight, `${(doc.grossKg || Math.round(totalKg * 1.031)).toLocaleString()}KG`],
                ])}
              </div>
              <Sig name="Nikola Stolarek-Przygonska Specjalista ds. Sprzedaży" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
