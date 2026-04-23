import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Brak zmiennych środowiskowych VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Certificates ─────────────────────────────────────────────────────────────

export async function fetchCertificates(filters = {}) {
  let q = supabase
    .from('certificates')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.buyer) q = q.ilike('buyer', `%${filters.buyer}%`)
  if (filters.productCode) q = q.eq('product_code', filters.productCode)
  if (filters.status) q = q.eq('status', filters.status)

  const { data, error } = await q
  if (error) throw error
  return data.map(dbToApp)
}

export async function saveCertificate(doc) {
  // Get next cert number atomically from DB
  const { data: numData, error: numErr } = await supabase
    .rpc('get_next_cert_number', { p_year: new Date().getFullYear() })
  if (numErr) throw numErr

  const certNumber = numData
  const row = appToDb({ ...doc, certNumber })

  const { data, error } = await supabase
    .from('certificates')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return dbToApp(data)
}

export async function updateCertificateStatus(id, status, extraFields = {}) {
  const { data, error } = await supabase
    .from('certificates')
    .update({ status, ...extraFields })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return dbToApp(data)
}

export async function deleteCertificate(id) {
  const { error } = await supabase
    .from('certificates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Buyers ───────────────────────────────────────────────────────────────────

export async function fetchBuyers() {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function saveBuyer(name, address) {
  const { data, error } = await supabase
    .from('buyers')
    .upsert({ name, address }, { onConflict: 'name' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBuyer(id) {
  const { error } = await supabase.from('buyers').delete().eq('id', id)
  if (error) throw error
}

// ─── Counter (preview only — actual number comes from DB function) ─────────────

export async function fetchCurrentCounter() {
  const year = new Date().getFullYear()
  const { data, error } = await supabase
    .from('cert_counter')
    .select('counter')
    .eq('year', year)
    .single()

  if (error) return 1
  return data.counter
}

// ─── Archive import (cert already exists, no new number needed) ────────────────

export async function archiveCertificate(doc) {
  const row = appToDb(doc)
  const { data, error } = await supabase
    .from('certificates')
    .insert({ ...row, status: 'archived' })
    .select()
    .single()

  if (error) throw error
  return dbToApp(data)
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function appToDb(doc) {
  return {
    cert_number:     doc.certNumber,
    cert_year:       new Date().getFullYear(),
    buyer:           doc.buyer,
    buyer_address:   doc.buyerAddress || '',
    product_code:    doc.productCode,
    product_name:    doc.productName,
    date_loading:    doc.dateLoading,
    date_production: doc.dateProduction,
    best_before:     doc.bestBefore,
    packaging:       doc.packaging,
    origin:          doc.origin,
    truck_number:    doc.truckNumber || '',
    pallets:         doc.pallets,
    kg_per_lot:      doc.kgPerLot,
    total_kg:        doc.totalKg,
    gross_kg:        doc.grossKg,
    lots:            doc.lots,
    doc_type:        doc.docType,
    lang:            doc.lang,
    status:          doc.status || 'saved',
    sent_date:       doc.sentDate || null,
    notes:           doc.notes || '',
  }
}

function dbToApp(row) {
  return {
    id:             row.id,
    certNumber:     row.cert_number,
    buyer:          row.buyer,
    buyerAddress:   row.buyer_address,
    productCode:    row.product_code,
    productName:    row.product_name,
    dateLoading:    row.date_loading,
    dateProduction: row.date_production,
    bestBefore:     row.best_before,
    packaging:      row.packaging,
    origin:         row.origin,
    truckNumber:    row.truck_number,
    pallets:        row.pallets,
    kgPerLot:       row.kg_per_lot,
    totalKg:        row.total_kg,
    grossKg:        row.gross_kg,
    lots:           row.lots,
    docType:        row.doc_type,
    lang:           row.lang,
    status:         row.status,
    sentDate:       row.sent_date,
    notes:          row.notes,
    createdAt:      row.created_at,
  }
}
