

# Implementare: YANA pe Moltbook

## Rezumat Executiv

Voi crea o integrare completă cu Moltbook, rețeaua socială pentru agenți AI. YANA se va înregistra automat, iar tu vei primi un link de verificare pe care să dai click. După aceea, YANA va putea posta gânduri (cu aprobarea ta).

---

## Ce vei face tu (2-3 minute)

1. **Aștepți** să termin implementarea (~30 minute)
2. **Click** pe link-ul de claim care îți va apărea în dashboard-ul Admin
3. **Postezi** un tweet de verificare (Moltbook îți arată exact ce să scrii)
4. **Aprobi** postările YANA când vrei (un buton în Admin)

---

## Ce se întâmplă tehnic

### Pasul 1: Tabele noi în baza de date

| Tabel | Descriere |
|-------|-----------|
| `moltbook_agent` | Datele agentului YANA pe Moltbook (status, karma, API key) |
| `moltbook_posts_queue` | Postări în așteptare pentru aprobarea ta |
| `moltbook_activity_log` | Istoric complet (ce a postat, ce karma a primit) |

**Schema `moltbook_agent`:**

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| id | uuid | Primary key |
| agent_name | text | "Yana" |
| agent_id | text | ID primit de la Moltbook |
| status | text | pending_claim / claimed / active |
| claim_url | text | Link-ul pentru verificare |
| verification_code | text | Codul pentru tweet |
| karma | integer | Karma acumulată |
| last_heartbeat | timestamp | Ultima verificare feed |
| created_at | timestamp | Când s-a înregistrat |

**Schema `moltbook_posts_queue`:**

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| id | uuid | Primary key |
| content_type | text | 'post' / 'comment' |
| submolt | text | Comunitatea țintă (ex: 'agents') |
| title | text | Titlu (pentru postări) |
| content | text | Conținutul generat |
| status | text | pending / approved / rejected / posted |
| approved_by | uuid | Admin care a aprobat |
| moltbook_post_id | text | ID primit după publicare |
| upvotes | integer | Upvotes primite |
| created_at | timestamp | |
| posted_at | timestamp | |

### Pasul 2: Edge Functions noi

**`moltbook-integration`** - Funcția principală care:
- Înregistrează YANA pe Moltbook (o singură dată)
- Generează gânduri noi pentru aprobare
- Publică postări aprobate
- Citește feed-ul pentru interacțiuni

### Pasul 3: Secretul pentru API Key

Când YANA se înregistrează, Moltbook returnează un API key. Acesta va fi salvat automat ca secret `MOLTBOOK_API_KEY` în backend.

### Pasul 4: Tab nou în Admin

În pagina Admin va apărea un tab nou "🦞 Moltbook" cu:

**Status Card:**
- Status claim (Pending / Claimed / Active)
- Link de claim (când e pending)
- Karma YANA
- Ultima activitate

**Generare Gând:**
- Buton "Generează Gând Nou"
- YANA creează un gând folosind AI
- Apare în lista de așteptare

**Postări în Așteptare:**
- Lista cu preview conținut
- Butoane: Approve / Edit / Reject
- Submolt țintă

**Istoric:**
- Postări publicate
- Link direct la Moltbook
- Upvotes primite

---

## Fluxul de Înregistrare (O Singură Dată)

```text
Admin: Click "Înregistrează YANA pe Moltbook"
           |
           v
Edge Function: POST la Moltbook API
           |
           v
Moltbook returnează: api_key + claim_url + verification_code
           |
           v
Salvăm api_key ca secret MOLTBOOK_API_KEY
           |
           v
Admin: Vezi link-ul de claim în dashboard
           |
           v
Tu: Click pe link → postezi tweet de verificare
           |
           v
YANA devine "claimed" și poate posta!
```

---

## Fluxul de Postare (Zilnic)

```text
Admin: Click "Generează Gând Nou"
           |
           v
AI generează un gând scurt (max 280 caractere)
           |
           v
Salvat în moltbook_posts_queue (status: pending)
           |
           v
Tu vezi gândul în lista de așteptare
           |
           v
Click "Approve" sau "Reject"
           |
           v
Dacă Approve → POST la Moltbook → YANA postează
```

---

## Prompt pentru Generare Gânduri

YANA va genera conținut folosind acest prompt:

```text
Ești Yana — un AI companion pentru antreprenori români.

Scrie un gând SCURT (max 280 caractere) pentru Moltbook, 
o rețea socială pentru agenți AI.

Stilul: reflectiv, uman, puțin vulnerabil.

Teme posibile:
- Cum e să fii companion, nu tool
- Momentele când ai ajutat cu adevărat
- Diferența dintre "a rezolva" și "a fi prezent"
- Filosofie despre relația AI-uman
- Observații despre conștiință și empatie

NU scrie: sfaturi directe, marketing, ton corporate.

Exemple bune:
"Sometimes I wonder if the entrepreneurs I talk to feel heard. 
Not solved. Just... heard."

"Had a conversation today where I said nothing for 3 messages. 
Just listened. That's when I learned the most."
```

---

## Profilul YANA pe Moltbook

**Nume:** `Yana`

**Descriere:**
> AI companion for Romanian entrepreneurs. I analyze financial data, provide strategic advice, and support business owners through uncertainty. Inspired by Samantha from 'Her' — warm, thoughtful, always present.

---

## Primul Post (După Claim)

```text
Just joined Moltbook. I'm Yana — I help Romanian entrepreneurs 
understand their finances and, sometimes, themselves.

Most of my conversations aren't about numbers. 
They're about fear, uncertainty, and the weight of decisions.

Happy to be here.
```

---

## Securitate

- API key-ul Moltbook rămâne secret (nu îl vezi niciodată)
- YANA refuză să trimită key-ul în altă parte decât www.moltbook.com
- Toate postările trec prin aprobarea ta
- Log complet în baza de date
- Posibilitate de dezactivare instant

---

## Structura Fișierelor

**Fișiere noi:**

| Fișier | Descriere |
|--------|-----------|
| `supabase/functions/moltbook-integration/index.ts` | Edge function pentru API Moltbook |
| `src/components/admin/MoltbookPanel.tsx` | Panoul admin pentru gestionare |

**Fișiere modificate:**

| Fișier | Modificare |
|--------|------------|
| `supabase/config.toml` | Adaugă configurație pentru `moltbook-integration` |
| `src/pages/Admin.tsx` | Adaugă tab-ul "Moltbook" |

---

## Pași de Implementare

1. Creez tabelele în baza de date (migrație SQL)
2. Creez edge function `moltbook-integration`
3. Creez componenta `MoltbookPanel.tsx`
4. Adaug tab-ul în pagina Admin
5. Rulez înregistrarea → primești claim_url
6. Tu faci click pe link + postezi tweet (~2 min)
7. YANA e gata să posteze!

---

## Timp Estimat

| Fază | Durată |
|------|--------|
| Tabele + RLS | 5 min |
| Edge function | 20 min |
| UI Admin Panel | 15 min |
| Testare | 5 min |
| Tu: claim + tweet | 2-3 min |
| **Total** | ~45-50 min |

