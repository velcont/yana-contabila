# YANA WhatsApp Bot — Cloud Edition

Bot WhatsApp conectat la dashboard-ul tău YANA. Configurezi din browser, rulezi pe calculatorul tău.

## Setup în 4 pași

1. **Instalează Node.js 18+** de la https://nodejs.org
2. **Deschide terminal în folderul ăsta** și rulează: `npm install`
3. **Copiază** `.env.example` în `.env` și completează `ANTHROPIC_API_KEY` + `BOT_TOKEN` (din YANA → Setări → WhatsApp Bot)
4. **Pornește**: `npm start` → scanează QR-ul cu WhatsApp pe telefon (Linked Devices)

Gata. Mergi în YANA să configurezi prompt-ul și răspunsurile keyword. Modificările se sincronizează automat la 60s.

## Cum funcționează

- Bot-ul rulează LOCAL pe calculatorul tău (telefonul + laptop trebuie să rămână conectate)
- La pornire și la 60s preia config-ul din cloud (YANA)
- Fiecare mesaj primit + răspuns se loghează în YANA → vezi în dashboard
- Heartbeat la 30s → YANA știe dacă e online

## Rulare permanentă (opțional)

Pentru server / 24/7 instalează `pm2`:
```bash
npm install -g pm2
pm2 start bot.js --name yana-wa-bot
pm2 save
pm2 startup
```

## Probleme

- **QR nu apare**: rulează cu `node bot.js` direct să vezi erorile complete
- **Auth failure**: șterge folderul `wa-session/` și reia setup-ul
- **Bot nu răspunde**: verifică în YANA că `enabled = true` și că ai cel puțin un keyword sau prompt configurat
