

# Plan: Grafana + PostHog Patterns pentru YANA

## Rezumat

Integrăm 4 funcționalități inspirate din Grafana și PostHog care lipsesc din YANA:

1. **Sistem de Alerting Configurabil** (Grafana-style) — reguli cu praguri care generează alerte automat
2. **Session Heatmap & Retention Grid** (PostHog-style) — cohort retention vizualizat ca heatmap
3. **Live Metrics Panel** (Grafana-style) — panouri KPI cu auto-refresh și sparklines
4. **Drop-off Funnel Enhancement** (PostHog-style) — upgrade FunnelAnalytics cu breakdown pe device/source

---

## Pas 1: Tabel `alert_rules` + Edge Function `check-alert-rules`

**Migrare SQL:**
```sql
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  metric TEXT NOT NULL, -- 'ai_cost_daily', 'error_rate', 'user_churn', 'low_engagement'
  operator TEXT NOT NULL DEFAULT 'gt', -- 'gt', 'lt', 'eq'
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  enabled BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage alert rules" ON public.alert_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

**Edge function `check-alert-rules`**: Iterează regulile active, evaluează metricile (query-uri pe `ai_usage`, `analytics_events`, `profiles`), și inserează în `admin_alerts` când pragul e depășit. Se va apela via cron la fiecare 5 minute.

## Pas 2: Componenta `AlertRulesManager.tsx`

UI admin pentru CRUD pe `alert_rules`:
- Lista regulilor existente cu toggle on/off
- Formular de adăugare: metric (dropdown), operator, threshold, severity
- Metrici disponibile: Cost AI zilnic (RON), Rata erori (%), Utilizatori noi/zi, Engagement score
- Badge cu ultima declanșare

## Pas 3: Componenta `LiveMetricsPanel.tsx`

Card-uri KPI cu auto-refresh (30s) inspirate din Grafana:
- **Utilizatori activi acum** (din `active_sessions`)
- **Cost AI azi** (din `ai_usage` luna curentă, ziua curentă)
- **Conversații azi** (din `analytics_events` event_name='chat_message_sent')
- **Rata conversie trial→paid** (din `profiles`)
- Fiecare card cu sparkline pe ultimele 7 zile (mini-LineChart Recharts)

## Pas 4: Componenta `RetentionHeatmap.tsx`

Heatmap PostHog-style pentru retenție pe cohorte:
- Cohorte lunare (signup month)
- Coloane: Săptămâna 0, 1, 2, 3, 4+
- Celule colorate gradient (verde intens = retenție mare, roșu = drop-off)
- Date din `analytics_events` (page_view per user per week)

## Pas 5: Upgrade `FunnelAnalytics.tsx`

Adăugăm breakdown PostHog-style:
- Segmentare pe device (mobile/desktop din user_agent)
- Segmentare pe sursă (referrer din event_data)
- Vizualizare comparativă side-by-side

## Pas 6: Integrare în Admin

- Tab nou "Monitoring" în Admin.tsx cu: `LiveMetricsPanel`, `AlertRulesManager`, alertele recente din `admin_alerts`
- `RetentionHeatmap` adăugat în tab-ul Analytics existent

## Fișiere afectate

| Fișier | Acțiune |
|---|---|
| `src/components/admin/AlertRulesManager.tsx` | NOU |
| `src/components/admin/LiveMetricsPanel.tsx` | NOU |
| `src/components/admin/RetentionHeatmap.tsx` | NOU |
| `supabase/functions/check-alert-rules/index.ts` | NOU |
| `src/components/analytics/FunnelAnalytics.tsx` | EDIT — breakdown device/source |
| `src/pages/Admin.tsx` | EDIT — tab Monitoring |
| Migrare DB | `alert_rules` table + RLS |

## Cost
- Edge function cron: ~0 (doar query-uri DB)
- Dashboard: 0 (client-side queries)

