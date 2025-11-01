# API Documentation - Yana

## 📋 Cuprins

- [Introducere](#introducere)
- [Autentificare](#autentificare)
- [Edge Functions](#edge-functions)
- [Database Schema](#database-schema)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Introducere

Yana folosește Lovable Cloud (Supabase) pentru backend. Toate API-urile sunt accesate prin Supabase client.

### Base URL

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

### Client Initialization

```typescript
import { supabase } from '@/integrations/supabase/client';
```

## Autentificare

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'John Doe',
      account_type: 'user'
    }
  }
});
```

**Response:**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token"
    }
  },
  "error": null
}
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

## Edge Functions

### AI Chat

**Endpoint:** `/functions/v1/chat-ai`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('chat-ai', {
  body: {
    message: 'Care sunt obligațiile fiscale pentru o SRL?',
    conversationHistory: [],
    userId: 'user-uuid'
  }
});
```

**Response:**

```json
{
  "response": "Pentru o SRL în România, obligațiile fiscale principale sunt...",
  "tokensUsed": 150,
  "cost": 0.002
}
```

### Fiscal Chat

**Endpoint:** `/functions/v1/fiscal-chat`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('fiscal-chat', {
  body: {
    message: 'Care e termenul de plată pentru TVA?',
    context: {
      companyType: 'SRL',
      fiscalRegime: 'standard'
    }
  }
});
```

**Response:**

```json
{
  "answer": "TVA se plătește lunar până la data de 25...",
  "references": [
    {
      "title": "Codul Fiscal Art. 156",
      "link": "https://..."
    }
  ],
  "tokensUsed": 120
}
```

### Strategic Advisor

**Endpoint:** `/functions/v1/strategic-advisor`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('strategic-advisor', {
  body: {
    conversationHistory: [...],
    message: 'Cum pot reduce costurile operaționale?',
    companyContext: {
      industry: 'retail',
      revenue: 1000000,
      employees: 10
    }
  }
});
```

**Response:**

```json
{
  "response": "Pentru reducerea costurilor în retail...",
  "suggestions": [
    "Automatizare procese",
    "Negociere furnizori",
    "Optimizare inventar"
  ],
  "cost": 0.005
}
```

### Analyze Balance

**Endpoint:** `/functions/v1/analyze-balance`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('analyze-balance', {
  body: {
    balanceData: {
      active: {
        imobilizari: 500000,
        stocuri: 200000,
        creante: 150000
      },
      pasive: {
        capitalPropriu: 600000,
        datorii: 250000
      }
    },
    fiscalParams: {
      year: 2024,
      quarter: 1
    }
  }
});
```

**Response:**

```json
{
  "analysis": {
    "summary": "Compania prezintă o situație financiară solidă...",
    "indicators": {
      "liquiditateGenerala": 2.5,
      "solvabilitate": 0.7,
      "rentabilitate": 15.3
    },
    "recommendations": [
      "Îmbunătățire colectare creanțe",
      "Optimizare nivel stocuri"
    ]
  },
  "tokensUsed": 500,
  "cost": 0.01
}
```

### CFO Advisor

**Endpoint:** `/functions/v1/cfo-advisor`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('cfo-advisor', {
  body: {
    query: 'Proiectează cash flow pentru Q2',
    financialData: {
      revenue: [100000, 120000, 110000],
      expenses: [80000, 85000, 82000],
      cashBalance: 50000
    }
  }
});
```

**Response:**

```json
{
  "insights": {
    "projection": "Cash flow pozitiv de ~45,000 RON în Q2",
    "runway": "12 luni la rata actuală de burn",
    "risks": ["Creștere cheltuieli operaționale"]
  },
  "recommendations": [
    "Creează rezervă siguranță minim 3 luni",
    "Diversifică surse venit"
  ]
}
```

### Create Checkout

**Endpoint:** `/functions/v1/create-checkout`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('create-checkout', {
  body: {
    priceId: 'price_xxx',
    userId: 'user-uuid',
    successUrl: 'https://app.yana.ro/success',
    cancelUrl: 'https://app.yana.ro/pricing'
  }
});
```

**Response:**

```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

### Send Analysis Email

**Endpoint:** `/functions/v1/send-analysis-email`

**Method:** POST

**Request:**

```typescript
const { data, error } = await supabase.functions.invoke('send-analysis-email', {
  body: {
    to: 'client@example.com',
    analysisId: 'analysis-uuid',
    subject: 'Analiza ta financiară',
    includeAttachment: true
  }
});
```

**Response:**

```json
{
  "success": true,
  "messageId": "msg_xxx"
}
```

## Database Schema

### profiles

```typescript
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: 'user' | 'accountant' | 'admin';
  company_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}
```

**Operations:**

```typescript
// Select
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Update
const { data, error } = await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('user_id', userId);
```

### companies

```typescript
interface Company {
  id: string;
  user_id: string;
  name: string;
  cui: string;
  reg_com: string;
  address: string | null;
  industry: string | null;
  employees_count: number | null;
  created_at: string;
  updated_at: string;
}
```

**Operations:**

```typescript
// Insert
const { data, error } = await supabase
  .from('companies')
  .insert({
    user_id: userId,
    name: 'SRL Example',
    cui: '12345678',
    reg_com: 'J40/1234/2024'
  });

// Select with filter
const { data, error } = await supabase
  .from('companies')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### analyses

```typescript
interface Analysis {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  content: any; // JSONB
  type: 'balance' | 'profit_loss' | 'cash_flow' | 'strategic';
  status: 'draft' | 'completed' | 'shared';
  shared_with: string[] | null;
  created_at: string;
  updated_at: string;
}
```

**Operations:**

```typescript
// Insert
const { data, error } = await supabase
  .from('analyses')
  .insert({
    user_id: userId,
    company_id: companyId,
    title: 'Analiză Q1 2024',
    content: analysisData,
    type: 'balance',
    status: 'completed'
  });

// Select with relations
const { data, error } = await supabase
  .from('analyses')
  .select(`
    *,
    companies (
      name,
      cui
    )
  `)
  .eq('user_id', userId);
```

### crm_clients

```typescript
interface CRMClient {
  id: string;
  accountant_id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  cui: string | null;
  status: 'lead' | 'active' | 'inactive';
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### ai_usage_tracking

```typescript
interface AIUsageTracking {
  id: string;
  user_id: string;
  function_name: string;
  tokens_used: number;
  cost: number;
  model: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
}
```

**Operations:**

```typescript
// Track usage
const { data, error } = await supabase
  .from('ai_usage_tracking')
  .insert({
    user_id: userId,
    function_name: 'chat-ai',
    tokens_used: 150,
    cost: 0.002,
    model: 'gpt-4',
    success: true
  });

// Get user costs
const { data, error } = await supabase
  .from('ai_usage_tracking')
  .select('cost, created_at')
  .eq('user_id', userId)
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

## Real-time Subscriptions

### Subscribe to Table Changes

```typescript
// Subscribe to new analyses
const channel = supabase
  .channel('analyses-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'analyses',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New analysis:', payload.new);
      // Update UI
    }
  )
  .subscribe();

// Unsubscribe
channel.unsubscribe();
```

### Subscribe to All Events

```typescript
const channel = supabase
  .channel('all-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'crm_clients'
    },
    (payload) => {
      console.log('Change detected:', payload);
    }
  )
  .subscribe();
```

## Error Handling

### Standard Error Format

```json
{
  "error": {
    "message": "Descriere eroare",
    "code": "ERROR_CODE",
    "details": "Detalii suplimentare"
  }
}
```

### Error Codes

- `PGRST116`: No rows found
- `23505`: Duplicate key violation
- `23503`: Foreign key violation
- `42501`: Insufficient privileges (RLS)
- `PGRST301`: JWT expired

### Error Handling Example

```typescript
try {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('No analysis found');
    } else if (error.code === '42501') {
      console.log('Access denied');
    } else {
      console.error('Database error:', error);
    }
    return null;
  }

  return data;
} catch (err) {
  console.error('Unexpected error:', err);
  return null;
}
```

## Rate Limiting

### Limits per Subscription Tier

| Tier | AI Requests/month | API Calls/minute | Storage |
|------|------------------|------------------|---------|
| Free | 10 | 60 | 100MB |
| Pro | 500 | 600 | 10GB |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Rate Limit Headers

```typescript
// Verifică headers din response
const response = await fetch(apiUrl);
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');
```

### Handling Rate Limits

```typescript
const makeRequestWithRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = error.headers?.['retry-after'] || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
};
```

## Best Practices

### 1. Always Handle Errors

```typescript
const { data, error } = await supabase
  .from('table')
  .select('*');

if (error) {
  console.error('Error:', error);
  // Handle error
}
```

### 2. Use TypeScript Types

```typescript
import type { Database } from '@/integrations/supabase/types';

type Analysis = Database['public']['Tables']['analyses']['Row'];
```

### 3. Implement Retry Logic

```typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['analyses'],
  queryFn: fetchAnalyses,
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
});
```

### 4. Cache Responses

```typescript
const { data } = useQuery({
  queryKey: ['analysis', id],
  queryFn: () => fetchAnalysis(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000 // 10 minutes
});
```

### 5. Optimize Queries

```typescript
// ✅ GOOD - Select only needed columns
const { data } = await supabase
  .from('analyses')
  .select('id, title, created_at');

// ❌ BAD - Select all columns
const { data } = await supabase
  .from('analyses')
  .select('*');
```

## Webhook Events

### Stripe Webhooks

**Endpoint:** `/functions/v1/stripe-webhook`

**Events Handled:**

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Health Check

**Endpoint:** `/functions/v1/health-check`

**Method:** GET

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "up",
    "storage": "up",
    "ai": "up"
  }
}
```

## Referințe

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
