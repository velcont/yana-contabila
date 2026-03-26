

# Plan: YANA Action Engine — "OpenClaw for Business"

## ✅ Implementat

### Tabel `yana_action_items`
- user_id, action_text, category, priority, status, deadline, reminder_at, generated_content
- RLS complet: users can CRUD own items
- Indexuri pe user_id+status și reminder_at

### Edge Function: `extract-actions`
- Apelat async din ai-router via EdgeRuntime.waitUntil()
- Folosește Gemini Flash Lite cu tool calling pentru extragere structurată
- Extrage: action_text, category (email/document/reminder/task/negotiation/verification), priority, suggested_deadline_days
- Salvează automat în yana_action_items

### Edge Function: `generate-action-document`
- Generează emailuri, documente, scripturi de negociere
- Autentificat cu JWT
- Salvează conținutul generat pe action item

### Edge Function: `action-reminder`
- Cron job care verifică reminder_at <= now()
- Marchează acțiunile overdue
- Curăță reminder_at după procesare

### Component: `ActionItemsPanel.tsx`
- Panou vizual cu acțiuni active (pending/in_progress/overdue)
- Color-coded pe prioritate (urgent=roșu, high=portocaliu, medium=galben, low=albastru)
- Butoane: "Făcut", "YANA generează", "Întreabă YANA"
- Colapsabil, afișat pe ecranul de welcome

### Suggestion Chip: "Ce am de făcut?"
- Primul chip din lista de sugestii
- Trimite mesaj la YANA cerând lista de acțiuni

### Integrare AI-Router
- extractActionsTask() adăugat la Promise.all() din EdgeRuntime.waitUntil()
- Rulează asincron după fiecare conversație

## TODO viitor
- [ ] Cron job pg_cron pentru action-reminder (zilnic)
- [ ] Email notificări pentru acțiuni overdue (integrare cu send-email)
- [ ] Raport săptămânal automat (luni dimineața)
- [ ] Export PDF al acțiunilor active
