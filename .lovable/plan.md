

# Audit: Open-Source Repos pentru Integrare in /Yana

## Cercetare efectuata

Am cautat pe GitHub proiecte open-source compatibile cu stack-ul YANA (React/TypeScript/Supabase/Deno Edge Functions). Mai jos sunt recomandarile filtrate dupa: compatibilitate tehnica, licenta (MIT/Apache), si valoare adaugata reala.

---

## TOP 5 Recomandari — Ordonate dupa Impact

### 1. Deep Research Agent — `dzhng/deep-research`
- **Stars**: 18,700 | **Licenta**: MIT | **Limbaj**: TypeScript 97%
- **Ce face**: Agent AI care face cercetare iterativa pe orice subiect — combina search engines, web scraping, si LLM-uri intr-un ciclu multi-hop cu rafinare automata
- **Ce adauga la YANA**: Comanda chat "Cerceteaza X in profunzime" → raport structurat cu surse citate. Complementeaza `yana-explorer` dar cu control direct al utilizatorului
- **Integrare**: Logica de orchestrare se poate porta ca Edge Function. Folosim Perplexity (deja configurat) + Firecrawl (deja folosit in `yana-explorer`) ca backend

### 2. TaxHacker — `vas3k/TaxHacker`
- **Stars**: 4,962 | **Licenta**: MIT | **Limbaj**: TypeScript 99%
- **Ce face**: Analiza AI a chitantelor, facturilor si tranzactiilor cu OCR, categorii custom, si suport multi-currency
- **Ce adauga la YANA**: Extragere automata de date din documente financiare uploadate (facturi, chitante PDF/imagine) → categorizare automata → rapoarte fiscale. YANA are deja `analyze-receipt` dar poate prelua logica de prompt engineering si categorii inteligente
- **Integrare**: Portarea prompt-urilor de analiza si a pipeline-ului de categorizare in `chat-ai` ca artifact tip "Analiza Document Financiar"

### 3. Supabase RAG Engine — `supavec/supabase-ai`
- **Stars**: 20 | **Licenta**: MIT | **Limbaj**: TypeScript + PLpgSQL
- **Ce face**: SDK TypeScript pentru RAG cu pgvector, semantic search, embeddings, si scoring de relevanta
- **Ce adauga la YANA**: Cautare semantica in memoria Yanei (`yana_semantic_memory`) — in loc de keyword matching, utilizatorul poate intreba "Ce am discutat despre investitii luna trecuta?" si primeste raspuns contextual precis
- **Integrare**: Migrare SQL pentru pgvector + functie de embedding in Edge Function. Se conecteaza direct la `memory-manager`

### 4. React Financial Charts — `react-financial/react-financial-charts`
- **Stars**: 1,403 | **Licenta**: MIT | **Limbaj**: TypeScript 99%
- **Ce face**: Componente React pentru grafice financiare profesionale — candlestick, volume, indicatori tehnici, overlay-uri
- **Ce adauga la YANA**: Inlocuieste graficele Recharts actuale din `TradingAnalysisArtifact` cu grafice financiare native (candlestick real, Bollinger Bands vizuale, MACD histogram). Upgrade vizual major
- **Integrare**: `npm install @react-financial/charts` → inlocuire componente in artifact-urile de trading din chat

### 5. CFO Stack — `MikeChongCan/cfo-stack`
- **Stars**: 16 | **Licenta**: Custom | **Limbaj**: TypeScript 63%
- **Ce face**: AI CFO virtual — analiza financiara, planificare fiscala, bookkeeping automat
- **Ce adauga la YANA**: Logica de "CFO virtual" — analiza automata a sanatatii financiare, recomandari de optimizare cash-flow, si planificare bugetara. Se poate adapta pentru piata romaneasca
- **Integrare**: Portarea algoritmilor de analiza financiara ca utilitare TypeScript in `src/utils/`

---

## Plan de Implementare (daca aprobi)

| Prioritate | Repo | Efort | Impact |
|-----------|------|-------|--------|
| P1 | Deep Research Agent | 2-3 ore | Foarte mare — functionalitate complet noua |
| P2 | React Financial Charts | 1-2 ore | Mare — upgrade vizual trading |
| P3 | TaxHacker prompts | 1 ora | Mediu — imbunatatire analiza documente |
| P4 | Supabase RAG/pgvector | 2 ore | Mare — cautare semantica in memorie |
| P5 | CFO Stack logica | 1-2 ore | Mediu — diagnostic financiar avansat |

### Ce voi face concret:

**Deep Research**: Edge Function `deep-research` cu ciclu iterativ: intrebare → sub-intrebari → cautare Perplexity → sinteza → raport cu citari. Activat din chat cu "Cerceteaza..." 

**Financial Charts**: Instalare pachet npm, inlocuire grafice din `TradingAnalysisArtifact.tsx` cu candlestick charts profesionale

**TaxHacker**: Portare prompt engineering pentru categorii fiscale si extragere structurata din documente

**RAG/pgvector**: Migrare SQL pentru vector search, embedding generation in Edge Function, cautare semantica in conversatii

**CFO Stack**: Algoritmi de health scoring financiar adaptati la legislatia RO

---

Spune-mi care din cele 5 vrei sa implementam (toate, sau selectiv).

