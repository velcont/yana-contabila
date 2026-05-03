## Samanta Voice Receptionist — Sprint 1

**Scope**: Voice inbound only (Twilio + ElevenLabs Samanta) + Dashboard `/samanta`. WhatsApp via Aria pe 0731377793 (în afara acestui sprint).

**Decizii confirmate:**
- Calea A: forwarding de pe GSM-ul actual către număr Twilio nou
- 24/7 răspuns (controlabil din UI după)
- Limbă: doar română
- Agent ElevenLabs existent: `agent_0701kqqhjszgfras171457cctcjy`

---

## Ce construiesc, în ordine

### 1. Conectori & secrete
- Conectez **ElevenLabs** ca connector Lovable Cloud (te prompt-uiește pentru API key)
- Verific Twilio (deja conectat conform memory)
- Adaug secret `SAMANTA_WEBHOOK_TOKEN` (random, validează webhook-urile noastre)

### 2. Schema DB (migration)
```text
samanta_settings
  user_id (PK, FK auth.users)
  active boolean default true
  schedule jsonb           -- {mode: '24_7' | 'window', windows: [...]}
  voice_id text default 'agent_0701kqqhjszgfras171457cctcjy'
  twilio_phone_number text -- numărul cumpărat
  forward_to_user_phone text -- GSM-ul tău (pentru "Preia tu")
  escalation_keywords text[] default '{urgent,anaf,amenda,control,procuror,executor}'
  language text default 'ro'
  greeting text            -- "Bună, sunt Samanta, asistenta lui [nume]..."
  created_at, updated_at

samanta_calls
  id, user_id (FK)
  twilio_call_sid text unique
  from_number text
  to_number text
  direction text default 'inbound'
  contact_id uuid nullable -- lookup CRM după from_number
  started_at, ended_at, duration_seconds
  status text              -- 'in_progress' | 'completed' | 'failed' | 'taken_over'
  transcript jsonb         -- [{role, text, ts}]
  summary text             -- generat post-call
  escalation_needed boolean
  recording_url text nullable
  created_at

samanta_callbacks
  id, user_id (FK), call_id (FK samanta_calls)
  contact_name text, contact_phone text
  scheduled_for timestamptz
  reason text
  status text default 'pending' -- 'pending' | 'done' | 'cancelled'
  created_at

samanta_blocked_numbers
  user_id, phone_number, reason, created_at
  PK (user_id, phone_number)
```
Toate cu RLS strict pe `user_id = auth.uid()`. Trigger pentru `updated_at`.

### 3. Edge functions (4 noi)

**`samanta-voice-incoming`** (`verify_jwt = false`)
- Primește webhook Twilio Voice când sună cineva
- Validează `X-Twilio-Signature`
- Caută settings după `to_number` → user_id
- Verifică program activ + apelant blocat
- Caută contact în CRM după `from_number` (preload context)
- Inserează rând `samanta_calls` cu status `in_progress`
- Returnează TwiML cu `<Connect><ConversationRelay>` către ElevenLabs
- Pasează în `customParameters` user_id, call_id, contact_context, greeting personalizat

**`samanta-voice-status`** (`verify_jwt = false`)
- Webhook Twilio status callback (ringing/answered/completed)
- Update `samanta_calls.status`, `ended_at`, `duration_seconds`

**`samanta-call-completed`** (`verify_jwt = false`)
- Webhook ElevenLabs post-call (transcript + audio)
- Validează HMAC ElevenLabs signature
- Salvează `transcript` + `recording_url`
- Cheamă `chat-ai` cu prompt: "Generează rezumat 2-3 propoziții + flag escalation + extrage callback dacă promis"
- Update `samanta_calls.summary`, `escalation_needed`
- Dacă promisiune callback → INSERT `samanta_callbacks`
- INSERT mesaj sistem în conversația YANA activă a userului: `📞 Te-a sunat ${nume} (${telefon}). ${rezumat}` cu link la transcript
- Dacă escalation → trimite push/email instant

**`samanta-toggle`** (`verify_jwt = true`)
- Endpoint pentru on/off rapid + update settings din UI
- Schimbă `active`, `schedule`, `escalation_keywords`

### 4. UI — pagina `/samanta`
Single page, urmează stilul existent (sidebar, dark, conversational). Tabs:

**Tab "Live"**
- Toggle mare ON/OFF "Samanta răspunde acum"
- Card "Apel în desfășurare" (realtime via Supabase channel pe `samanta_calls`)
- Buton "Preia tu" → cheamă `samanta-takeover` (forward live la GSM)

**Tab "Istoric"**
- Listă apeluri (from_number, contact name dacă identificat, durată, summary)
- Click → expandă transcript + player audio
- Filtre: doar escaladate, doar callback-uri promise

**Tab "Setări"**
- Greeting personalizat (textarea) — preview cu TTS test
- Program (24/7 / window picker)
- Cuvinte trigger escaladare (chip input)
- Numere blocate (chip input)
- Numărul Twilio activ (read-only, cu instrucțiuni forward `**61*${number}#`)

**Tab "Callbacks"**
- Promisiuni de revenire pe care Samanta le-a făcut
- Marchează "Sunat" / "Anulat"
- Notificare push când e momentul

### 5. Integrare în chat YANA
- Mesaje sistem `samanta_call_summary` apar în istoric (component nou `SamantaCallCard.tsx`) cu emoji 📞, durată, sumar, buton "Vezi transcript"
- Realtime: când vine un apel, în chat apare card live
- Tool nou în `yana-agent`: `samanta_get_recent_calls(limit)` — pentru întrebări gen "ce apeluri am avut azi?"

### 6. Sidebar
Adaug item "📞 Samanta" sub "CRM" (ordine confirmată din memory).

---

## Ce ai de făcut TU în paralel cu mine

1. **Twilio Console** — cumperi un număr românesc:
   - Console → Phone Numbers → Buy a Number → Country: Romania → Capabilities: Voice ✓
   - Cost: ~5€/lună
   - **NU configura webhook-ul încă** — îți dau eu URL-urile după deploy
2. **ElevenLabs** — verifici că agentul `agent_0701kqqhjszgfras171457cctcjy` are:
   - Voice română setat
   - System prompt placeholder (îl suprascriem dinamic per apel)
3. **GSM forwarding** — îl activezi DOAR după ce testăm că Samanta răspunde corect pe numărul Twilio direct. Codul: `**61*${numar_twilio}#` apel. Dezactivare: `##61#`.

---

## Ordine de implementare (4 pași testabili)

1. **Setup**: connector ElevenLabs + migration DB + secret
2. **Edge functions voice** + deploy + testare directă pe numărul Twilio (apel real, eu verific log-uri)
3. **Dashboard `/samanta`** cu toate tabs + integrare sidebar
4. **Integrare chat YANA**: card live + summary în istoric + tool agent

Fiecare pas e testabil independent. La final test end-to-end: tu suni numărul Twilio → vorbești cu Samanta → în chat-ul tău YANA apare rezumatul în <30s.

---

## Estimare cost recurent
- Twilio număr: ~5€/lună
- Twilio voice inbound: ~0.0085€/min (~2€/lună la 100 apeluri × 2 min)
- ElevenLabs Conversational: ~0.08€/min (~16€/lună)
- **Total: ~23€/lună la trafic mediu**

---

## Note tehnice / riscuri

- ElevenLabs ConversationRelay (Twilio media stream) e GA din 2024 — folosim direct, fără bridge custom
- Webhook signing: Twilio (`X-Twilio-Signature`) + ElevenLabs (`ElevenLabs-Signature`) — ambele validate strict
- Realtime UI: enable `samanta_calls` în `supabase_realtime` publication
- "Preia tu" v1 = forward live (Twilio `<Dial>`); v2 (sprint următor) = cobor în WebRTC browser direct
- Nu salvăm audio mai vechi de 30 zile (cron) — privacy + cost storage

---

Confirmă "merge" și încep cu pasul 1 (connector + DB + secret).