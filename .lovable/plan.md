

# Plan: Demo Mode cu Countdown (5 întrebări gratuite)

## Obiectiv
Implementarea unui mod Demo pe landing page care permite utilizatorilor să pună 5 întrebări gratuite FĂRĂ cont, cu YANA informându-i după fiecare răspuns câte întrebări mai au disponibile.

---

## Arhitectura Soluției

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          LANDING PAGE                                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     DemoChat Component                             │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ Mesaj YANA: "Salut! Ai 5 întrebări gratuite. Cu ce începem?"│  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ User: "Care sunt indicatorii cheie pentru profit?"          │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ YANA: "[Răspuns] Mai ai 4 întrebări în modul Demo."         │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              ↓                                          │
│                    După 5 întrebări:                                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ YANA: "Mi-a făcut plăcere să discutăm! Creează-ți un cont        │ │
│  │ gratuit pentru a continua - ai 30 de zile să testezi tot."       │ │
│  │ [Buton: Creează cont gratuit]                                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Ce se creează

### 1. Edge Function: `demo-chat` (NOU)
**Locație:** `supabase/functions/demo-chat/index.ts`

**Responsabilități:**
- Procesează mesaje demo FĂRĂ autentificare
- Verifică IP rate limiting (max 5 mesaje per IP per 24h)
- Apelează AI (Lovable AI - nu necesită API key extern)
- NU salvează nimic în baza de date
- Adaugă automat countdown-ul la sfârșitul răspunsului

**Logică Countdown:**
```text
Întrebarea 1 → Răspuns + "📝 Mai ai 4 întrebări în modul Demo."
Întrebarea 2 → Răspuns + "📝 Mai ai 3 întrebări în modul Demo."
Întrebarea 3 → Răspuns + "📝 Mai ai 2 întrebări în modul Demo."
Întrebarea 4 → Răspuns + "📝 Aceasta e ultima întrebare gratuită!"
Întrebarea 5 → Răspuns + CTA pentru creare cont
```

### 2. Componenta: `DemoChat.tsx` (NOU)
**Locație:** `src/components/demo/DemoChat.tsx`

**Caracteristici:**
- UI simplificat bazat pe design-ul YanaChat
- Stare locală (localStorage) pentru mesaje demo
- Contador vizibil: "Demo Mode • 3/5 întrebări rămase"
- După 5 întrebări: overlay cu CTA pentru signup
- NU apelează funcții care necesită autentificare

### 3. Actualizare: `Landing.tsx`
**Modificări:**
- Adaugă buton "Încearcă fără cont" sub CTA principal
- Toggle pentru afișarea DemoChat ca modal/expandable
- Tracking analytics pentru utilizarea demo-ului

---

## Detalii Tehnice

### Edge Function `demo-chat`

**Securitate IP Rate Limiting:**
```text
1. Extrage IP din headers (x-forwarded-for sau x-real-ip)
2. Verifică în tabel demo_rate_limits dacă IP-ul are < 5 cereri în ultimele 24h
3. Incrementează counter pentru IP
4. Respinge cu mesaj prietenos dacă limit atins
```

**Prompt AI dedicat:**
```text
Ești Yana, asistent AI pentru business. Acesta e un mod DEMO - 
răspunde concis (max 150 cuvinte), prietenos, și profesional.
Focus pe valoarea pe care o poți oferi cu un cont complet.
```

### Componenta DemoChat

**State Management:**
```text
- demoMessages: array în localStorage
- demoCount: număr (0-5) în localStorage
- showSignupOverlay: boolean când count >= 5
```

**Mesaje Countdown (adăugate de backend):**
- Count 1: "📝 Mai ai **4 întrebări** în modul Demo. Creează cont pentru acces nelimitat!"
- Count 2: "📝 Mai ai **3 întrebări** în modul Demo."
- Count 3: "📝 Mai ai **2 întrebări** în modul Demo."
- Count 4: "📝 Aceasta e **ultima întrebare** gratuită!"
- Count 5: Mesaj final cu CTA

---

## Garanții de Securitate

| Aspect | Implementare |
|--------|--------------|
| Nu se poate bypassa limita prin cache clear | IP rate limiting pe server |
| Utilizatorii autentificați nu pot abuza | Demo-chat verifică să NU existe auth header |
| Funcțiile principale rămân protejate | ai-router, strategic-advisor etc. cer auth |
| Nu se salvează date sensibile | Demo nu scrie în DB (doar rate limit counter) |
| Trial-ul de 30 zile rămâne intact | set-trial-for-new-users trigger neschimbat |

---

## Fișiere Afectate

| Fișier | Acțiune | Descriere |
|--------|---------|-----------|
| `supabase/functions/demo-chat/index.ts` | CREARE | Edge function pentru demo |
| `src/components/demo/DemoChat.tsx` | CREARE | Componenta chat demo |
| `src/pages/Landing.tsx` | MODIFICARE | Adaugă buton și integrare demo |
| `supabase/config.toml` | MODIFICARE | Adaugă config pentru demo-chat (verify_jwt=false) |

---

## Migrare DB necesară

Tabel nou pentru rate limiting:
```sql
CREATE TABLE demo_rate_limits (
  ip_hash TEXT PRIMARY KEY,  -- Hash pentru GDPR
  request_count INTEGER DEFAULT 1,
  first_request_at TIMESTAMPTZ DEFAULT now(),
  last_request_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Fluxul Utilizatorului

1. **Vizitator pe landing** → Vede "Încearcă fără cont" sub CTA principal
2. **Click** → Se deschide DemoChat cu mesaj: "Salut! Ai 5 întrebări gratuite..."
3. **Pune întrebare** → Primește răspuns + countdown
4. **După 5 întrebări** → Overlay: "Creează cont gratuit pentru a continua"
5. **Click signup** → Redirect la /auth?redirect=/yana cu trial 30 zile activat

---

## Timp estimat implementare
~2-3 sesiuni de lucru

