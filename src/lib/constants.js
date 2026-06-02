export const COMPANY = {
  name: 'Eco-core Sp. z o. o.',
  address: 'Ul. Mysia Góra 18A, 44-144 Nieborowice',
  plant: 'Ul. Komunalna 12, 62-731 Przykona',
  tel: '+48 608 586 524',
  nip: '969-159-38-80',
  regon: '241945484',
}

export const today = () => new Date().toISOString().slice(0, 10)

export const fmtD = d => {
  if (!d) return ''
  const s = d.slice(0, 10)
  const [y, m, day] = s.split('-')
  return `${day}.${m}.${y}`
}

export const addDays = (d, days) => {
  if (!d) return ''
  const dt = new Date(d)
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().slice(0, 10)
}

export const addYear = d => addDays(d, 364)

export const yearShort = () => new Date().getFullYear().toString().slice(2)

export function generateLots(prefix, lotNumber, count, kgPerLot) {
  if (!prefix || !lotNumber || count < 1) return []
  return Array.from({ length: count }, () => ({
    lot: `${prefix}${lotNumber}`,
    qty: kgPerLot,
  }))
}

export const EN = {
  qcTitle: 'QUALITY CERTIFICATE',
  buyer: 'Buyer', product: 'Product', dateLoading: 'Date of loading',
  dateProd: 'Date of production', bestBefore: 'Best before', qty: 'Quantity',
  packaging: 'Packaging', quality: 'Quality', storage: 'Storage conditions',
  origin: 'Country of origin', lotNumber: 'Lot number, amount',
  articleCode: 'Article Code',
  declaration: 'The product complies with Product Specification and legal requirements.',
  appearance: 'Appearance and color: Color from cream to yellow',
  smell: 'Smell and taste: typical for dried potato.',
  moisture: 'Moisture: max. 9%.',
  impurities: 'Content of mechanical/ferromagnetic impurities: absence.',
  organoleptic: 'Organoleptic quality check: good.',
}

export const PL = {
  qcTitle: 'CERTYFIKAT JAKOŚCI',
  buyer: 'Nabywca', product: 'Produkt', dateLoading: 'Data załadunku',
  dateProd: 'Data produkcji', bestBefore: 'Termin ważności', qty: 'Ilość',
  packaging: 'Opakowanie', quality: 'Jakość', storage: 'Warunki przechowywania',
  origin: 'Kraj pochodzenia', lotNumber: 'Numer partii, ilość',
  articleCode: 'Kod artykułu',
  declaration: 'Produkt jest zgodny ze Specyfikacją Produktu i wymogami prawnymi.',
  appearance: 'Wygląd i kolor: od kremowego do żółtego',
  smell: 'Zapach i smak: typowy dla suszonego ziemniaka.',
  moisture: 'Wilgotność: maks. 9%.',
  impurities: 'Zawartość zanieczyszczeń: brak.',
  organoleptic: 'Ocena organoleptyczna: dobra.',
}
