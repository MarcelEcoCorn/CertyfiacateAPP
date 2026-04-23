# 🌿 Ecocorn — System Certyfikatów Jakości

Aplikacja do tworzenia Quality Certificate i Packing List.  
Stack: **React + Vite → GitHub → Vercel + Supabase**

---

## 📋 KROK 1 — Supabase (baza danych)

1. Zaloguj się na [supabase.com](https://supabase.com) i otwórz swój projekt
2. Przejdź do **SQL Editor** (lewy panel)
3. Wklej całą zawartość pliku `supabase_schema.sql` i kliknij **Run**
4. Przejdź do **Project Settings → API**
5. Skopiuj:
   - **Project URL** (np. `https://abcdef.supabase.co`)
   - **anon public key** (długi ciąg znaków)

---

## 📋 KROK 2 — Plik .env (zmienne środowiskowe)

W folderze projektu utwórz plik `.env` (na podstawie `.env.example`):

```
VITE_SUPABASE_URL=https://TWÓJ-PROJEKT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=TWÓJ-ANON-KEY
```

> ⚠️ Plik `.env` jest w `.gitignore` — nie zostanie wysłany na GitHub (to dobrze).

---

## 📋 KROK 3 — GitHub (repozytorium)

```bash
# W folderze projektu:
git init
git add .
git commit -m "Initial commit — Ecocorn certificates"

# Na GitHub.com utwórz nowe repozytorium (np. "ecocorn"),
# a potem:
git remote add origin https://github.com/TWÓJ-LOGIN/ecocorn.git
git branch -M main
git push -u origin main
```

---

## 📋 KROK 4 — Vercel (hosting)

1. Zaloguj się na [vercel.com](https://vercel.com)
2. Kliknij **"New Project"** → wybierz swoje repozytorium `ecocorn` z GitHub
3. Framework preset: **Vite** (zostanie wykryty automatycznie)
4. Przed kliknięciem "Deploy" przejdź do **Environment Variables** i dodaj:
   - `VITE_SUPABASE_URL` = `https://TWÓJ-PROJEKT-ID.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `TWÓJ-ANON-KEY`
5. Kliknij **Deploy**

Po ~1 minucie aplikacja jest dostępna pod adresem `https://ecocorn.vercel.app` (lub podobnym).

---

## 📋 KROK 5 — Lokalne uruchomienie (development)

```bash
npm install
npm run dev
```

Aplikacja dostępna pod: `http://localhost:5173`

---

## 🔄 Aktualizacje

Po każdej zmianie kodu:
```bash
git add .
git commit -m "Opis zmian"
git push
```
Vercel automatycznie wdroży nową wersję (~30 sekund).

---

## 📁 Struktura projektu

```
ecocorn/
├── src/
│   ├── App.jsx              # Główna aplikacja
│   ├── main.jsx             # Entry point React
│   ├── lib/
│   │   ├── supabase.js      # Klient Supabase + wszystkie zapytania do bazy
│   │   └── constants.js     # Produkty, opakowania, tłumaczenia, helpery
│   └── components/
│       ├── UI.jsx           # Komponenty UI (Input, Select, CertRow...)
│       └── Preview.jsx      # Podgląd i druk certyfikatu
├── supabase_schema.sql      # Schemat bazy danych (uruchom raz w Supabase)
├── .env.example             # Szablon zmiennych środowiskowych
├── .env                     # Twoje klucze (NIE commituj!)
├── .gitignore
├── index.html
├── vite.config.js
└── package.json
```

---

## 🗄️ Tabele w Supabase

| Tabela | Opis |
|--------|------|
| `certificates` | Wszystkie certyfikaty (QC + PL) |
| `buyers` | Baza nabywców z adresami |
| `cert_counter` | Licznik numerów certyfikatów (per rok) |

Funkcja `get_next_cert_number()` atomowo pobiera i zwiększa licznik — eliminuje duplikaty numerów nawet przy równoczesnym użyciu.
