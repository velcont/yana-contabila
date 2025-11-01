# Arhitectura Yana

## 📋 Cuprins

- [Overview](#overview)
- [Stack Tehnologic](#stack-tehnologic)
- [Structura Proiectului](#structura-proiectului)
- [Arhitectura Backend](#arhitectura-backend)
- [Arhitectura Frontend](#arhitectura-frontend)
- [Flux de Date](#flux-de-date)
- [Securitate](#securitate)
- [Performance](#performance)

## Overview

Yana este o platformă AI pentru consultanță fiscală și strategică, construită pe o arhitectură modernă și scalabilă.

### Principii Arhitecturale

1. **Separation of Concerns**: Backend (Lovable Cloud/Supabase) separat de Frontend (React)
2. **Component-Based Architecture**: Componente React reutilizabile și modulare
3. **Type Safety**: TypeScript pentru siguranța tipurilor
4. **Real-time First**: Actualizări în timp real folosind Supabase Realtime
5. **Security by Default**: RLS policies și autentificare securizată

## Stack Tehnologic

### Frontend
- **Framework**: React 18 cu TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **AI Integration**: Lovable AI (Gemini, GPT-4)

### Backend (Lovable Cloud)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Edge Functions**: Deno runtime
- **Real-time**: Supabase Realtime

### Testing & Quality
- **Testing Framework**: Vitest
- **Component Testing**: React Testing Library
- **Monitoring**: Sentry
- **Performance**: Custom performance monitoring

## Structura Proiectului

```
yana/
├── src/
│   ├── components/          # Componente React
│   │   ├── ui/             # Componente UI de bază (shadcn)
│   │   ├── cfo/            # Componente CFO Dashboard
│   │   ├── yanacrm/        # Componente CRM
│   │   └── resilience/     # Componente analiza reziliență
│   ├── pages/              # Pagini aplicație
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React Context providers
│   ├── utils/              # Utilități și helpers
│   ├── lib/                # Librării și configurări
│   ├── integrations/       # Integrări externe
│   │   └── supabase/       # Client și types Supabase
│   ├── schemas/            # Zod schemas pentru validare
│   └── services/           # Business logic services
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── config.toml         # Configurare Supabase
└── public/                 # Static assets

```

## Arhitectura Backend

### Database Schema

#### Tabele Principale

**profiles**
- Informații utilizatori extinse
- RLS: users pot accesa doar propriul profil

**companies**
- Date companii clienți
- RLS: access bazat pe user_id

**analyses**
- Analize financiare generate
- RLS: access bazat pe user_id sau shared_with

**crm_clients**
- Clienți CRM
- RLS: access bazat pe accountant_id

**ai_usage_tracking**
- Tracking utilizare AI și costuri
- RLS: admin only pentru citire globală

### Edge Functions

#### Categorii de Funcții

1. **AI Functions**
   - `chat-ai`: Chat conversațional
   - `fiscal-chat`: Consultanță fiscală
   - `strategic-advisor`: Consilier strategic
   - `cfo-advisor`: Analiză CFO

2. **Analysis Functions**
   - `analyze-balance`: Analiză bilanț contabil
   - `client-due-diligence`: Due diligence client

3. **Payment Functions**
   - `create-checkout`: Checkout Stripe
   - `stripe-webhook`: Webhook Stripe
   - `create-credits-checkout`: Cumpărare credite AI

4. **Email Functions**
   - `send-analysis-email`: Trimitere analiză
   - `send-broadcast-email`: Email bulk
   - `process-scheduled-emails`: Procesare emailuri programate

5. **Utility Functions**
   - `health-check`: Health check sistem
   - `track-ai-usage`: Tracking AI usage

### RLS Policies

Toate tabelele au RLS (Row Level Security) activat:

```sql
-- Exemplu: profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

## Arhitectura Frontend

### Structura Componentelor

```
Component Hierarchy:
App
├── AuthProvider
├── ThemeProvider
├── QueryClientProvider
└── Router
    ├── Layout Components
    │   ├── Navigation
    │   ├── Sidebar
    │   └── Footer
    └── Page Components
        ├── Dashboard
        ├── CRM
        ├── Analytics
        └── Settings
```

### State Management

1. **Server State**: React Query
   - Cache queries
   - Automatic refetching
   - Optimistic updates

2. **UI State**: React Context
   - Theme context
   - Subscription context
   - Tutorial context

3. **Form State**: React Hook Form
   - Validare cu Zod
   - Error handling

### Custom Hooks

```typescript
// Authentication
useAuth() // Gestionează starea auth

// User role
useUserRole() // Returnează role-ul utilizatorului

// Analytics
useAnalytics() // Tracking evenimente

// Visual feedback
useVisualFeedback() // Feedback UI

// Tutorial
useTutorialSteps() // Ghidare utilizator
```

## Flux de Date

### 1. Autentificare

```
User → Auth Page → Supabase Auth
                      ↓
                  JWT Token
                      ↓
                  useAuth Hook
                      ↓
                  Protected Routes
```

### 2. Încărcare Date

```
Component Mount
    ↓
React Query
    ↓
Supabase Client
    ↓
Edge Function (optional)
    ↓
Database
    ↓
RLS Check
    ↓
Response
    ↓
Cache & UI Update
```

### 3. Real-time Updates

```
Database Change
    ↓
Supabase Realtime
    ↓
WebSocket Connection
    ↓
Component Subscription
    ↓
Automatic UI Update
```

### 4. AI Interactions

```
User Input
    ↓
Frontend Validation
    ↓
Edge Function (chat-ai, etc.)
    ↓
Lovable AI / OpenAI
    ↓
Response Streaming
    ↓
UI Update + Cost Tracking
```

## Securitate

### Măsuri de Securitate

1. **Authentication**
   - Email/Password cu validare
   - Email confirmation (auto-confirm în dev)
   - Session management

2. **Authorization**
   - RLS policies pe toate tabelele
   - Role-based access control (admin, accountant, user)
   - Function-level authorization

3. **Data Protection**
   - Encrypted at rest (Supabase)
   - HTTPS only
   - Secrets management
   - HTML sanitization (DOMPurify)

4. **API Security**
   - Rate limiting
   - CORS configuration
   - API key protection
   - Webhook signature verification (Stripe)

### Best Practices

```typescript
// ✅ GOOD - folosește RLS
const { data } = await supabase
  .from('analyses')
  .select('*')
  // RLS face filtering automat

// ❌ BAD - nu bypassa RLS
const { data } = await supabase
  .from('analyses')
  .select('*')
  .eq('user_id', userId) // redundant, RLS face asta
```

## Performance

### Optimizări Implementate

1. **Code Splitting**
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Image Optimization**
   - Lazy loading
   - Responsive images
   - WebP support
   - Optimized dimensions

3. **Bundle Optimization**
   - Tree shaking
   - Minification (esbuild)
   - Chunk splitting
   - Compression

4. **Caching Strategy**
   - React Query cache
   - Stale-while-revalidate
   - Aggressive caching pentru static assets

5. **Database Optimization**
   - Indexes pe query-uri frecvente
   - Materialized views pentru reports
   - Connection pooling

### Performance Monitoring

```typescript
// Custom performance monitoring
performanceMonitor.mark('component-mount');
performanceMonitor.measure('render-time', 'component-mount');
```

### Metrics Țintă

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTI** (Time to Interactive): < 3.5s

## Design System

### Tokens Semantice

```css
/* index.css */
:root {
  --primary: 220 70% 50%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 60%;
  
  /* Never use direct colors like text-white */
  /* Always use semantic tokens */
}
```

### Component Variants

```typescript
// Folosește cva pentru variante
const buttonVariants = cva(
  "base-styles",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "...",
        outline: "..."
      }
    }
  }
);
```

## Scalabilitate

### Pregătit pentru Scalare

1. **Horizontal Scaling**: Edge functions auto-scale
2. **Database**: Connection pooling, read replicas ready
3. **CDN**: Static assets servite prin CDN
4. **Caching**: Multi-layer caching strategy
5. **Monitoring**: Sentry pentru error tracking

### Limite Curente

- **AI Usage**: Rate limiting bazat pe subscription
- **Storage**: Limite per user
- **API Calls**: Rate limiting per user
- **Concurrent Users**: Unlimited (Supabase scale)

## Deployment

### Production Pipeline

1. Build assets (Vite)
2. Deploy edge functions (automatic)
3. Run migrations (automatic)
4. Deploy frontend (Lovable)
5. Invalidate CDN cache

### Environment Variables

```bash
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_PUBLISHABLE_KEY=xxx
VITE_SUPABASE_PROJECT_ID=xxx
```

## Referințe

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Testing Guide](./TESTING_GUIDE.md)
