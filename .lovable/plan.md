

# Fix: Două buguri pe /yana — "refresh" la revenire în tab + prima întrebare dispare

## Problema 1: Pagina pare că se reîncarcă la revenirea în tab

Când utilizatorul pleacă din tab (alt-tab, altă fereastră) și revine, Supabase GoTrueClient face automat refresh la auth token. Asta declanșează `onAuthStateChange` → `useAuth` actualizează starea `user`/`session` → `useSubscription` și `useAICredits` reintră în loading (`loading: true`) → linia 97 din Yana.tsx afișează spinner-ul "Yana se pregătește..." → când loading-ul se termină, componentele se re-montează de la zero, pierdem scroll-ul, și pare un refresh complet.

**Fix**: Nu mai afișa spinner-ul dacă utilizatorul a fost deja autentificat. Folosim o referință `initialLoadDone` care devine `true` după prima încărcare reușită. La re-verificări ulterioare (token refresh), nu mai arătăm spinner.

### Fișier: `src/pages/Yana.tsx`
- Adaugă `const initialLoadDone = useRef(false)`
- După ce toate loading-urile se termină prima dată, setează `initialLoadDone.current = true`
- La condiția de loading (linia 97), verifică: `if ((loading || subscriptionLoading || creditsLoading) && !initialLoadDone.current)` — adică spinner-ul apare DOAR la prima încărcare, nu la re-verificări

---

## Problema 2: Prima întrebare a utilizatorului dispare

Când utilizatorul trimite primul mesaj pe o conversație nouă (`conversationId === null`):

1. `sendMessage` creează o conversație nouă (linia 250)
2. Apelează `onConversationCreated(convId)` (linia 251) — asta setează `activeConversationId` în parent
3. Adaugă mesajul user-ului în UI (linia 290)
4. Salvează mesajul în DB (linia 293)
5. **RACE CONDITION**: Schimbarea `conversationId` de la `null` la `convId` declanșează `useEffect[conversationId]` (linia 169) care apelează `loadMessages()`
6. `loadMessages` face `setMessages(...)` cu datele din DB — suprascrie starea curentă
7. Mesajul user-ului adăugat la pasul 3 poate fi pierdut dacă `loadMessages` rulează la momentul nepotrivit

**Fix**: Adaugă un flag `isSendingRef` care previne `loadMessages` de la suprascrierea mesajelor în timp ce `sendMessage` este activ.

### Fișier: `src/components/yana/YanaChat.tsx`
- Adaugă `const isSendingRef = useRef(false)`
- În `sendMessage`: setează `isSendingRef.current = true` la început, `false` în `finally`
- În `loadMessages` (useEffect la linia 169): dacă `isSendingRef.current === true`, skip — nu suprascrie mesajele

---

## Rezumat modificări

| Fișier | Ce se schimbă |
|--------|--------------|
| `src/pages/Yana.tsx` | Spinner doar la prima încărcare, nu la token refresh |
| `src/components/yana/YanaChat.tsx` | Guard `isSendingRef` în loadMessages pentru a preveni race condition |

## Rezultat
- Tab switch nu mai cauzează flash/spinner
- Prima întrebare rămâne vizibilă după ce Yana răspunde

