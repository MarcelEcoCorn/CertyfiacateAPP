export const COMPANY = {
  name: 'Eco-corn Sp. z o. o.',
  address: 'Ul. Mysia Góra 18A, 44-144 Nieborowice',
  plant: 'Ul. Komunalna 12, 62-731 Przykona',
  tel: '+48 608 586 524',
  nip: '969-159-38-80',
  regon: '241945484',
}

export const PRODUCTS = [
  { code: '4.1/P', name: 'Dried Potato Powder',    namePL: 'Suszone Puree Ziemniaczane' },
  { code: '3.1/S', name: 'Dried Potato Semolina',  namePL: 'Kasza Ziemniaczana Suszona' },
  { code: '2.1/F', name: 'Dried Potato Flakes',    namePL: 'Płatki Ziemniaczane Suszone' },
  { code: '1.1/G', name: 'Dried Potato Granules',  namePL: 'Granulat Ziemniaczany Suszony' },
]

export const PACKAGINGS = [
  { label: 'Papper Bag 25kg', value: 'PAPPER BAGS 25', bagKg: 25,   bagsPerPallet: 40 },
  { label: 'Papper Bag 50kg', value: 'PAPPER BAGS 50', bagKg: 50,   bagsPerPallet: 20 },
  { label: 'Big-Bag 1000kg',  value: 'BIG-BAG',        bagKg: 1000, bagsPerPallet: 1  },
]

export const STATUS_COLOR = {
  saved:    '#378add',
  sent:     '#1d9e75',
  archived: '#888780',
}

export const STATUS_LABEL = {
  saved:    'Zapisany',
  sent:     'Wysłany',
  archived: 'Archiwum',
}

export const today = () => new Date().toISOString().slice(0, 10)

export const fmtD = d => {
  if (!d) return ''
  const s = d.slice(0, 10)
  const [y, m, day] = s.split('-')
  return `${day}.${m}.${y}`
}

export const addYear = d => {
  if (!d) return ''
  const dt = new Date(d)
  dt.setFullYear(dt.getFullYear() + 1)
  return dt.toISOString().slice(0, 10)
}

export const yearShort = () => new Date().getFullYear().toString().slice(2)

export function generateLots(prefix, startSerial, count, kgPerLot) {
  if (!prefix || !startSerial || count < 1) return []
  const base = parseInt(startSerial, 10)
  if (isNaN(base)) return []
  return Array.from({ length: count }, (_, i) => ({
    lot: `${prefix}${base + i}`,
    qty: kgPerLot,
  }))
}

export const EN = {
  qcTitle: 'QUALITY CERTIFICATE', plTitle: 'Packing List',
  buyer: 'Buyer', product: 'Product', dateLoading: 'Date of loading',
  dateProd: 'Date of production', bestBefore: 'Best before', qty: 'Quantity',
  packaging: 'Packaging', quality: 'Quality', storage: 'Storage conditions',
  origin: 'Country of origin', lotNumber: 'Lot number, amount',
  recipient: 'Recipient', truck: 'Truck number', articleCode: 'Article Code',
  pallets: 'Number of pallets', netWeight: 'Net weight of goods',
  grossWeight: 'Gross weight', bagWeight: 'Weight of one Papper Bag',
  declaration: 'The product complies with Product Specification and legal requirements.',
  appearance: 'Appearance and color: Color from cream to yellow',
  smell: 'Smell and taste: typical for dried potato.',
  moisture: 'Moisture: max. 9%.',
  impurities: 'Content of mechanical/ferromagnetic impurities: absence.',
  organoleptic: 'Organoleptic quality check: good.',
}

export const PL = {
  qcTitle: 'CERTYFIKAT JAKOŚCI', plTitle: 'Lista Pakowania',
  buyer: 'Nabywca', product: 'Produkt', dateLoading: 'Data załadunku',
  dateProd: 'Data produkcji', bestBefore: 'Termin ważności', qty: 'Ilość',
  packaging: 'Opakowanie', quality: 'Jakość', storage: 'Warunki przechowywania',
  origin: 'Kraj pochodzenia', lotNumber: 'Numer partii, ilość',
  recipient: 'Odbiorca', truck: 'Numer ciężarówki', articleCode: 'Kod artykułu',
  pallets: 'Liczba palet', netWeight: 'Waga netto towarów',
  grossWeight: 'Waga brutto', bagWeight: 'Waga jednego worka',
  declaration: 'Produkt jest zgodny ze Specyfikacją Produktu i wymogami prawnymi.',
  appearance: 'Wygląd i kolor: od kremowego do żółtego',
  smell: 'Zapach i smak: typowy dla suszonego ziemniaka.',
  moisture: 'Wilgotność: maks. 9%.',
  impurities: 'Zawartość zanieczyszczeń mechanicznych/ferromagnetycznych: brak.',
  organoleptic: 'Ocena organoleptyczna: dobra.',
}
