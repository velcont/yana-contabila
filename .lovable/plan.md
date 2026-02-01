
# Widget Monitoring Alerts pentru Version Refresh în /admin

## Rezumat
Voi crea un widget dedicat în pagina Admin care monitorizează performanța sistemului de Version Refresh și generează alerte vizuale când refresh-ul durează mai mult de 5 secunde.

---

## Fișiere de creat/modificat

| Fișier | Acțiune | Descriere |
|--------|---------|-----------|
| `src/components/admin/VersionRefreshMonitor.tsx` | **CREAT** | Componentă nouă pentru monitorizare |
| `src/pages/Admin.tsx` | **MODIFICAT** | Lazy import + Tab nou |

---

## Detalii Implementare

### 1. Componentă nouă: VersionRefreshMonitor.tsx

**Funcționalități:**
- Query la `analytics_events` pentru evenimente `version_refresh` din ultimele 24h
- Statistici agregate: total refresh-uri, durată medie, procent refresh-uri lente
- Alertă vizuală roșie când există refresh-uri > 5 secunde
- Tabel cu ultimele 10 refresh-uri și detalii (durată, trigger, status)
- Auto-refresh la 60 secunde

**Threshold alertă:** `SLOW_THRESHOLD_MS = 5000` (5 secunde)

### 2. Modificări Admin.tsx

- Lazy load componentă nouă
- Tab nou "Version Refresh" cu icon RefreshCw
- TabsContent cu Suspense wrapper

---

## UI Preview

```text
┌─────────────────────────────────────────────────┐
│ ⏱️ Monitoring Version Refresh                  │
├─────────────────────────────────────────────────┤
│ Ultimele 24h:                                   │
│   • Total refresh-uri: 47                       │
│   • Durată medie: 2.3s                          │
│   • Refresh-uri lente (>5s): 3 (6.4%)           │
│                                                 │
│ ⚠️ ALERTĂ: 3 refresh-uri au durat >5s          │
│                                                 │
│ Ultimele 10 refresh-uri:                        │
│ ┌────────────┬────────┬──────────┬───────────┐ │
│ │ Data       │ Durată │ Trigger  │ Status    │ │
│ ├────────────┼────────┼──────────┼───────────┤ │
│ │ 14:32      │ 1.2s   │ banner   │ ✓         │ │
│ │ 14:15      │ 7.8s   │ timeout  │ ⚠️ LENT   │ │
│ └────────────┴────────┴──────────┴───────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Query SQL

```typescript
const { data } = await supabase
  .from('analytics_events')
  .select('event_data, created_at, user_id')
  .eq('event_name', 'version_refresh')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## Componente UI folosite

- Card, CardHeader, CardTitle, CardContent (layout)
- Badge cu variante: default (normal), destructive (alert)
- Table, TableHeader, TableBody, TableRow, TableCell
- Alert cu AlertCircle pentru alertele active
- RefreshCw icon pentru refresh manual
