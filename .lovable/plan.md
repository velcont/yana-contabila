

# Fix: Eliminare Loop Infinit de Refresh

## Cauza root a loop-ului

Există **4 probleme** care se combină într-un loop infinit:

### Bug 1: Race condition între SW unregister și controllerchange
- `performVersionRefresh()` dezînregistrează Service Worker-ul
- Asta declanșează evenimentul `controllerchange` din `main.tsx` (linia 24)
- Care face `window.location.reload()` ÎNAINTE ca `window.location.href = ...` să se execute
- Rezultat: reload infinit fără să se salveze versiunea

### Bug 2: Protecția `justRefreshed` durează doar 5 secunde
- După refresh, banner-ul e ascuns 5 secunde (`setTimeout → setJustRefreshed(false)`)
- După 5s, dacă query-ul DB returnează altă versiune → banner reapare → countdown → refresh din nou

### Bug 3: Triggere multiple de refresh care se bat
- `VersionUpdateBanner` (countdown 60s)
- `useAuth` (la login)
- `App.tsx` (inactivitate 24h)
- Toate apelează `performVersionRefresh()` independent, pot rula simultan

### Bug 4: localStorage save poate eșua
- `localStorage.setItem(DB_VERSION_KEY, currentVersion)` se face înainte de refresh
- Dar dacă reload-ul vine din `controllerchange` (Bug 1), save-ul nu s-a completat
- După reload: versiunea locală e tot cea veche → detectează "versiune nouă" → loop

## Soluția

### 1. Eliminare `controllerchange` reload din `main.tsx`
- Eliminăm listener-ul agresiv care face reload la schimbarea SW
- PWA-ul deja gestionează update-urile prin `skipWaiting + clientsClaim`

### 2. Protecție anti-loop cu MAX_REFRESH_COUNT
- Salvăm în sessionStorage un contor de refresh-uri
- Dacă s-au făcut >2 refresh-uri în aceeași sesiune, STOP - nu mai forțăm
- Resetăm contorul doar la navigare manuală

### 3. Eliminare force refresh automat (countdown)
- Banner-ul rămâne vizibil dar NU mai face refresh automat după 60s
- Utilizatorul decide când dă click - fără FOMO de countdown
- Elimină complet riscul de loop automat

### 4. Salvare versiune ROBUST înainte de orice refresh
- `localStorage.setItem` se face SINCRON înainte de orice altceva
- Adăugăm verificare că s-a salvat corect
- Folosim `sessionStorage` ca backup anti-loop

## Fișiere modificate

| Fișier | Modificare |
|--------|-----------|
| `src/main.tsx` | Eliminare `controllerchange` listener |
| `src/components/VersionUpdateBanner.tsx` | Eliminare countdown/force refresh, adăugare anti-loop guard |
| `src/utils/versionRefresh.ts` | Adăugare MAX_REFRESH guard, salvare versiune robustă |
| `src/hooks/useAuth.tsx` | Adăugare guard anti-loop la login refresh |

## Comportament nou
- Banner apare când există versiune nouă (non-agresiv, fără countdown)
- Click pe "Actualizează" → refresh sigur, o singură dată
- Dacă refresh-ul nu rezolvă (DB version persistă diferit) → banner rămâne vizibil dar NU mai forțează refresh
- Zero risc de loop infinit

