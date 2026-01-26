
# Plan: Fix Eroare "Risc ANAF" fără Balanță Încărcată

## Problema identificată

Când utilizatorul apasă butonul "Risc ANAF" **fără a avea o balanță încărcată**, aplicația afișează o eroare tehnică în loc de un mesaj prietenos.

**Cauza**: În `ai-router/index.ts` (linia 614-617), când `calculate-anaf-risk` returnează status 400, eroarea este aruncată ca excepție:

```typescript
if (!response.ok) {
  throw new Error(`Route ${routeDecision.route} failed: ${errorText}`);
}
```

## Soluția

Adăugăm gestionare specială pentru `calculate-anaf-risk` când nu există balanță - în loc să aruncăm eroare, returnăm un mesaj conversațional prietenos.

---

## Modificări tehnice

### Fișier: `supabase/functions/ai-router/index.ts`

**Locație**: liniile 614-617 (verificarea `!response.ok`)

**Schimbare**: Adăugăm gestionare specială ÎNAINTE de throw pentru rutele care pot eșua graceful:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  
  // Special handling for ANAF risk without balance - return friendly message
  if (routeDecision.route === 'calculate-anaf-risk' && response.status === 400) {
    console.log('[AI-Router] ANAF risk requested without balance - returning friendly message');
    return new Response(
      JSON.stringify({
        success: true,
        response: "Pentru a calcula riscul de control ANAF, am nevoie să încarci mai întâi o balanță de verificare. 📊\n\nApasă pe butonul **Analiză financiară** și încarcă fișierul Excel cu balanța ta. Apoi voi putea analiza:\n- Riscuri TVA (solduri mari de recuperat, raporturi anormale)\n- Marje de profit și cheltuieli administrative\n- Datorii fiscale restante\n- Stocuri și creanțe neîncasate\n- Tranzacții cu părți afiliate",
        route: 'calculate-anaf-risk',
        requiresBalance: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  throw new Error(`Route ${routeDecision.route} failed: ${errorText}`);
}
```

---

## Beneficii

- Utilizatorul primește un mesaj clar și prietenos în chat
- Nu mai apare eroarea tehnică "The app encountered an error"
- YANA explică ce trebuie să facă utilizatorul
- Zero risc - nu modificăm logica existentă, doar adăugăm un early return pentru cazul specific

---

## Timp estimat

5 minute
