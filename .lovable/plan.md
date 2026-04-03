
# Plan: Procurement Intelligence Agent pentru YANA

## Rezumat
Adaptăm conceptele din Agentic-Procure-Audit-AI la arhitectura YANA (Edge Functions + React), creând un sistem de analiză furnizori și oferte accesibil direct din chat-ul YANA.

## Ce preluăm (adaptat)

### 1. Edge Function `analyze-supplier` — Supplier Scoring Agent
- Primește date furnizor (nume, CUI, ofertă, preț, termeni)
- Folosește Perplexity pentru web research (reputație furnizor, prețuri piață)
- Returnează scor multi-criteriu: **Preț (0-100), Fiabilitate (0-100), Risc (0-100)**
- Recomandare: APROBAT / DE REVIZUIT / RESPINS cu explicații
- Comparație cu prețuri de piață găsite online

### 2. Edge Function `extract-bid-data` — Structured Bid Extraction
- Primește text din document uploadat (ofertă/factură)
- Extrage automat: furnizor, preț, monedă, termen livrare, garanție, referință
- Returnează JSON structurat gata de utilizat

### 3. Tabel `supplier_analyses` — Istoric analize furnizori
- user_id, supplier_name, cui, scores (JSONB), recommendation, market_prices, web_sources
- RLS: utilizatorii văd doar propriile analize

### 4. Pagina `/supplier-audit` — UI Procurement Intelligence
- Formular: nume furnizor, CUI, preț ofertă, descriere produs
- Card rezultat cu scoruri vizuale (progress bars)
- Comparație prețuri piață
- Istoric analize anterioare

### 5. Integrare în Yana Chat
- Când utilizatorul întreabă despre un furnizor, YANA poate invoca automat analiza
- Adăugăm capabilitatea în ai-router

## Fișiere noi
| Fișier | Descriere |
|---|---|
| `supabase/functions/analyze-supplier/index.ts` | Supplier scoring + web research |
| `supabase/functions/extract-bid-data/index.ts` | Structured extraction din documente |
| `src/pages/SupplierAudit.tsx` | Pagina UI |
| Migrare DB | Tabel `supplier_analyses` |

## Fișiere editate
| Fișier | Ce se schimbă |
|---|---|
| `src/App.tsx` | Ruta `/supplier-audit` |

## Dependențe
- Perplexity API (deja conectat) pentru web research
- Lovable AI models pentru extracție structurată
