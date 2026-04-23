-- ============================================================
-- ECOCORN Certificate System — Supabase Schema
-- Uruchom ten skrypt w Supabase SQL Editor
-- ============================================================

-- Tabela certyfikatów
CREATE TABLE IF NOT EXISTS certificates (
  id            BIGSERIAL PRIMARY KEY,
  cert_number   TEXT NOT NULL UNIQUE,          -- np. "96/2026/EN"
  cert_year     INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),

  -- Nabywca
  buyer         TEXT NOT NULL,
  buyer_address TEXT,

  -- Produkt
  product_code  TEXT NOT NULL,                 -- np. "4.1/P"
  product_name  TEXT NOT NULL,

  -- Daty
  date_loading    DATE NOT NULL,
  date_production DATE NOT NULL,
  best_before     DATE NOT NULL,

  -- Logistyka
  packaging    TEXT NOT NULL,
  origin       TEXT NOT NULL DEFAULT 'Poland',
  truck_number TEXT,
  pallets      INT NOT NULL,
  kg_per_lot   INT NOT NULL,
  total_kg     INT NOT NULL,
  gross_kg     INT NOT NULL,

  -- Partie LOT — zapisane jako JSON array
  -- Format: [{"lot": "4.1/P/26/171", "qty": 1000}, ...]
  lots         JSONB NOT NULL DEFAULT '[]',

  -- Metadane dokumentu
  doc_type     TEXT NOT NULL DEFAULT 'both',   -- 'both' | 'qc' | 'pl'
  lang         TEXT NOT NULL DEFAULT 'EN',     -- 'EN' | 'PL'
  status       TEXT NOT NULL DEFAULT 'saved',  -- 'saved' | 'sent' | 'archived'
  sent_date    DATE,
  notes        TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Licznik numerów certyfikatów (jeden rekord na rok)
CREATE TABLE IF NOT EXISTS cert_counter (
  year    INT PRIMARY KEY,
  counter INT NOT NULL DEFAULT 1
);

-- Wstaw rekord dla bieżącego roku z numerem 96
-- (96 = następny po ostatnim wystawionym 95/2026/EN)
INSERT INTO cert_counter (year, counter)
VALUES (2026, 96)
ON CONFLICT (year) DO NOTHING;

-- Tabela nabywców (zarządzana przez użytkownika)
CREATE TABLE IF NOT EXISTS buyers (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wstaw domyślnych nabywców
INSERT INTO buyers (name, address) VALUES
  ('OHO GROUP UAB', 'Jiesios G.2, Ilgakiemis LT 53288 Kauno Lithuania'),
  ('IFSA Gmbh', 'Schönbrunner Strasse 36 1050 Wien Austria')
ON CONFLICT (name) DO NOTHING;

-- Trigger: aktualizuj updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Funkcja atomowego pobrania i inkrementacji licznika
-- Zwraca nowy numer certyfikatu jako tekst np. "96/2026/EN"
CREATE OR REPLACE FUNCTION get_next_cert_number(p_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT)
RETURNS TEXT AS $$
DECLARE
  v_counter INT;
BEGIN
  INSERT INTO cert_counter (year, counter)
  VALUES (p_year, 2)
  ON CONFLICT (year) DO UPDATE
    SET counter = cert_counter.counter + 1
  RETURNING counter - 1 INTO v_counter;

  RETURN v_counter || '/' || p_year || '/EN';
END;
$$ LANGUAGE plpgsql;

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_certificates_buyer ON certificates (buyer);
CREATE INDEX IF NOT EXISTS idx_certificates_product ON certificates (product_code);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates (status);
CREATE INDEX IF NOT EXISTS idx_certificates_date ON certificates (date_loading DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_year ON certificates (cert_year);

-- Row Level Security (opcjonalne — włącz jeśli chcesz auth)
-- ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cert_counter ENABLE ROW LEVEL SECURITY;

-- Na razie pozwól na wszystko (aplikacja wewnętrzna bez logowania)
-- Jeśli chcesz dodać logowanie w przyszłości, zmień te polityki
GRANT ALL ON certificates TO anon, authenticated;
GRANT ALL ON buyers TO anon, authenticated;
GRANT ALL ON cert_counter TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_next_cert_number TO anon, authenticated;
