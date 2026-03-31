

## Plan: Automatizare Outreach YANA cu Cron Jobs

Eroarea `dist upload failed` este o problemă tranzitorie de infrastructură (nu de cod) — se rezolvă prin republicare.

### Ce implementez

**1. Migrare SQL (via insert tool)** — Activez extensiile și creez 2 cron jobs:
- `pg_cron` + `pg_net` extensions
- **Job 1**: `yana-auto-prospect` — zilnic la 08:00 UTC, apelează `yana-prospector`
- **Job 2**: `yana-auto-send` — zilnic la 10:00 UTC, apelează `yana-outreach-sender`
- URL: `https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/{function-name}`
- Auth: Bearer token cu anon key

**2. Actualizare Dashboard** (`src/components/admin/OutreachDashboard.tsx`)
- Adaug indicator vizual "🤖 Automatizare activă" cu orarul cron-urilor
- Butoanele manuale rămân ca backup

### Fișiere modificate

| Fișier | Acțiune |
|--------|---------|
| SQL (insert tool, nu migrare) | Creare 2 cron jobs |
| `src/components/admin/OutreachDashboard.tsx` | Indicator automatizare |

