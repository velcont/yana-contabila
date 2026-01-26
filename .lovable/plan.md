

# Plan: Widget Monitorizare Statusul API-urilor în Admin

## Obiectiv

Crearea unui widget compact în pagina `/admin` care arată statusul tuturor API-urilor într-o singură vedere, cu indicatori vizuali de sănătate și linkuri rapide pentru reîncărcare.

## API-uri de Monitorizat

| Provider | Secret Key | Verificare Balanță Posibilă? |
|----------|------------|------------------------------|
| Lovable AI | `LOVABLE_API_KEY` | Da (monitorizat intern) |
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | Nu - dashboard extern |
| OpenAI (GPT-5) | `OPENAI_API_KEY` | Nu - dashboard extern |
| xAI (Grok) | `GROK_API_KEY` | Nu - dashboard extern |
| Perplexity | `PERPLEXITY_API_KEY` | Nu - dashboard extern |

## Soluție Propusă

### Componentă Nouă: `ApiStatusWidget.tsx`

Un card compact care arată:
- Status fiecărui API (Activ / Nesetat / Eroare)
- Link rapid către dashboard-ul extern al fiecărui provider
- Warning general dacă vreun API are probleme

### Secțiuni Widget

```text
┌─────────────────────────────────────────────────────────┐
│  🔌 Status API-uri                        [Refresh]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Lovable AI      250.00 RON   [View Dashboard]      │
│  ✅ Anthropic       Activ        [View Dashboard]      │
│  ✅ OpenAI          Activ        [View Dashboard]      │
│  ✅ Grok            Activ        [View Dashboard]      │
│  ✅ Perplexity      Activ        [View Dashboard]      │
│                                                         │
│  ⚠️ Resend          Nesetat      [Configurează]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Logică Verificare

1. **Lovable AI**: Verificare balanță din `platformCredits` + autonomie din `PlatformCosts`
2. **Alte API-uri**: Verificăm doar dacă secretul este setat (nu putem verifica balanța externă)
3. **Indicator vizual**:
   - 🟢 Verde = Secret setat, funcționează
   - 🟡 Galben = Secret setat dar risc scăzut de credite
   - 🔴 Roșu = Secret nesetat sau eroare

### Linkuri Externe Dashboard

| Provider | Dashboard URL |
|----------|---------------|
| Lovable | `https://lovable.dev/settings/workspace/usage` |
| Anthropic | `https://console.anthropic.com/settings/billing` |
| OpenAI | `https://platform.openai.com/usage` |
| xAI (Grok) | `https://console.x.ai/` |
| Perplexity | `https://www.perplexity.ai/settings/api` |

## Fișiere de Creat/Modificat

### 1. Componentă Nouă: `src/components/admin/ApiStatusWidget.tsx`

```tsx
// Widget compact pentru status API-uri
// - Listează toate API-urile cu status
// - Link rapid către dashboard extern
// - Verifică dacă secretele sunt setate
// - Indicator vizual per API
```

### 2. Modificare: `src/pages/Admin.tsx`

- Import lazy al noii componente
- Adăugare widget în partea de sus a paginii (sub Quick Access Card pentru Platform Costs)

## Implementare Tehnică

### Verificare Secreturi

Vom verifica existența secreturilor prin apelarea edge function-urilor și handling erorilor:
- Dacă un edge function returnează eroare de API key missing → marcat ca nesetat
- Dacă funcționează → marcat ca activ

**Alternativă simplificată**: Afișăm doar link-urile și utilizatorul verifică manual. Widget-ul servește ca "checklist" centralizat.

### Estimare Timp

| Task | Timp |
|------|------|
| Creare `ApiStatusWidget.tsx` | 15 min |
| Integrare în `Admin.tsx` | 5 min |
| **Total** | **20 min** |

## Rezultat Final

Un widget compact în `/admin` care:
1. Arată toate API-urile folosite de YANA
2. Indicator dacă secretul e setat
3. Link rapid către dashboard-ul fiecărui provider
4. Servește ca "checklist" pentru admin să verifice periodic creditele

