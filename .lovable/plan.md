

# Plan: Modul Analiză Investiții — Orice Platformă de Trading

## Obiectiv

Yana va putea analiza capturi de ecran de pe **orice platformă de trading** (eToro, Trading 212, XTB, Interactive Brokers, Revolut, BT Capital, TradeVille, Freedom24, Saxo, Degiro, Plus500, etc.) și va oferi:
- Analiza portofoliului din screenshot
- Recomandări de investiții bazate pe profil de risc
- Previziuni și scenarii
- Sfaturi de diversificare
- Informații despre taxare în România (10% pe câștig capital)

## Ce se implementează

### 1. Prompt specializat investiții (fișier nou)
**Fișier:** `supabase/functions/_shared/investment-analysis-prompt.ts`

Knowledge base cuprinzător:
- Recunoaștere screenshot-uri de pe **orice platformă** (nu doar eToro): coloane tipice (ticker, P&L, avg price, current price, allocation %)
- Analiza fundamentală: P/E, P/B, dividend yield, market cap, beta, EPS
- Analiza tehnică: suport/rezistență, RSI, MACD, medii mobile, volume
- Strategii: DCA, value investing, growth, dividende, ETF-uri
- Taxare România: 10% impozit pe câștiguri capital, declarația unică ANAF, compensare pierderi
- Currency risk: RON→USD/EUR
- Disclaimer obligatoriu la fiecare răspuns

### 2. Detecție investiții în ai-router
**Fișier:** `supabase/functions/ai-router/index.ts`

- Keywords: investiții, acțiuni, portofoliu, trading, bursă, stocks, ETF, dividende, broker, S&P500, NASDAQ, crypto, Bitcoin, plus orice nume de platformă (eToro, XTB, Trading 212, Revolut, TradeVille, etc.)
- Dacă mesajul conține imagine + keywords → flag `isInvestmentQuery: true`
- Dacă doar text cu keywords de investiții → tot flag-ul se aplică

### 3. Integrare în chat-ai
**Fișier:** `supabase/functions/chat-ai/index.ts`

- Când `isInvestmentQuery === true`: injectează promptul de investiții în system prompt
- Instrucțiuni multimodale: "Analizează screenshot-ul. Identifică platforma, lista de active, prețuri, profit/pierdere, alocare procentuală. Recomandă acțiuni concrete."
- Forțează disclaimer legal la final

### 4. Actualizare capabilities
**Fișier:** `supabase/functions/_shared/prompts/yana-capabilities-prompt.md`

Adăugăm secțiunea de analiză investiții cu toate platformele suportate.

### 5. Actualizare chat-ai-prompt
**Fișier:** `supabase/functions/_shared/prompts/chat-ai-prompt.md`

Secțiune nouă despre competența de investiții + disclaimer obligatoriu.

## Detalii tehnice

- **Fără tabele noi** — conversațiile se salvează în `ai_conversations` existent
- **Fără edge function nouă** — folosim `chat-ai` cu prompt injection
- **Model:** Gemini 2.5 Flash (deja configurat, suport multimodal/imagini)
- **Fără API extern** — analiza se face prin AI pe baza cunoștințelor modelului + ce vede în imagine
- **Deploy:** `chat-ai`, `ai-router`

## Platforme suportate (recunoaștere vizuală)

eToro, Trading 212, XTB, Interactive Brokers, Revolut, TradeVille, BT Capital Partners, Freedom24, Saxo Bank, Degiro, Plus500, IG Markets, Exante, Webull, Robinhood, MetaTrader 4/5, TradingView, Binance, Coinbase, Kraken, și orice altă platformă cu interfață tabelară.

## Disclaimer obligatoriu

Fiecare răspuns despre investiții va conține:
> "⚠️ Aceste informații sunt orientative și NU constituie sfat financiar profesionist. Investițiile implică riscuri, inclusiv pierderea integrală a capitalului. Consultă un consilier financiar autorizat ASF."

