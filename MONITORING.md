# Sistem de Monitorizare și Analytics - YANA

Această aplicație include 3 sisteme complete de monitorizare:

## 1. 📊 Error Tracking cu Sentry

### Setup
1. Creează un cont gratuit pe [sentry.io](https://sentry.io)
2. Creează un nou proiect React
3. Copiază DSN-ul primit
4. Adaugă DSN-ul în fișierul `src/utils/sentry.ts`:
   ```typescript
   dsn: "https://your-sentry-dsn@sentry.io/your-project-id"
   ```

### Funcționalități
- **Captare automată erori**: Toate erorile JavaScript sunt trimise automat către Sentry
- **Session Replay**: Înregistrează sesiuni pentru debugging (10% din sesiuni normale, 100% din sesiuni cu erori)
- **Performance Monitoring**: Monitorizează performanța aplicației
- **Error Context**: Include informații despre browser, user, și stack trace

### Utilizare manuală
```typescript
import { logError, logMessage } from '@/utils/sentry';

// Log erori
try {
  // cod
} catch (error) {
  logError(error, { context: 'additional info' });
}

// Log mesaje
logMessage('Important event happened', 'warning');
```

## 2. 📈 Analytics Custom

### Funcționalități
- **Page Views**: Tracking automat pentru toate paginile
- **User Events**: Tracking pentru acțiuni importante:
  - Analize create
  - Export PDF
  - Mesaje chat
  - Conversații vocale
  - Erori
  
### Utilizare
```typescript
import { analytics } from '@/utils/analytics';

// Track evenimente
analytics.pageView('dashboard');
analytics.analysisCreated('Numele Firmei', 'xlsx');
analytics.chatMessage(messageText.length);
analytics.voiceStarted();
analytics.error(error.message, error.stack);
```

### Vizualizare Date
- Adminii pot vedea toate evenimentele în tabela `analytics_events`
- Utilizatorii pot vedea propriile evenimente
- Date includ: user_id, event_name, event_data, page_url, user_agent, timestamp

## 3. 🏥 Health Checks

### Acces
Doar administratorii pot accesa: `/system-health`

### Ce se verifică
1. **Database**: Conexiune și timp de răspuns
2. **Auth Service**: Funcționalitate autentificare
3. **Storage**: Accesibilitate serviciu stocare
4. **OpenAI API**: Disponibilitate API AI

### Statusuri
- ✅ **Healthy**: Serviciul funcționează normal (< 1s DB, < 500ms Auth, < 1s Storage, < 2s API)
- ⚠️ **Degraded**: Funcționează dar lent
- ❌ **Down**: Nu este disponibil

### Edge Function
Health check-ul poate fi rulat manual sau programat:
```bash
# Rulare manuală
curl -X POST https://your-project.supabase.co/functions/v1/health-check

# Programare cu cron (necesită pg_cron activat)
SELECT cron.schedule(
  'health-check-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/health-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

## 📊 Tabele Database

### analytics_events
- `id`: UUID
- `user_id`: UUID (nullable pentru evenimente anonime)
- `event_name`: Text (tip eveniment)
- `event_data`: JSONB (date suplimentare)
- `page_url`: Text
- `user_agent`: Text
- `ip_address`: Text
- `created_at`: Timestamp

### system_health
- `id`: UUID
- `check_type`: Text (database, auth, storage, openai_api)
- `status`: Text (healthy, degraded, down)
- `response_time_ms`: Integer
- `error_message`: Text (nullable)
- `metadata`: JSONB
- `checked_at`: Timestamp

## 🔒 Securitate

### RLS Policies
- **analytics_events**: Oricine poate insera, utilizatorii văd propriile evenimente, adminii văd tot
- **system_health**: Doar service role poate insera, doar adminii pot vedea

### Best Practices
1. **Nu trimite date personale sensibile** în event_data
2. **Sanitizează erorile** înainte de logging pentru a nu expune date sensibile
3. **Limitează volumul** de evenimente pentru a evita costuri mari
4. **Monitorizează performanța** - tracking-ul nu trebuie să încetinească aplicația

## 📱 Integrare în Componente

### Hook pentru page tracking
```typescript
import { usePageTracking } from '@/hooks/useAnalytics';

function MyComponent() {
  usePageTracking(); // Track automat page views
  
  return <div>...</div>;
}
```

### Hook pentru analytics
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();
  
  const handleAction = () => {
    analytics.analysisCreated('Company', 'xlsx');
  };
  
  return <button onClick={handleAction}>Create</button>;
}
```

## 🚀 Next Steps

1. **Configurează Sentry DSN** pentru production
2. **Activează pg_cron** pentru health checks automate
3. **Creează dashboard analytics** pentru vizualizare date
4. **Setează alerte** pentru health checks failed
5. **Monitorizează volumul** de evenimente și optimizează

## 💡 Tips

- În development, Sentry este dezactivat (verifică cu `import.meta.env.MODE`)
- Health checks pot fi rulate manual din pagina `/system-health`
- Analytics sunt captate în timp real și pot fi interogați din Supabase
- Toate sistemele sunt optimizate pentru a nu afecta performanța aplicației
