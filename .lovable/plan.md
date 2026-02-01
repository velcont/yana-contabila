
# Plan: Remediere Completă Cache Landing Page

## Cauza Rădăcină Identificată

Tabelul `app_updates` are RLS activat cu o singură politică care permite citirea doar pentru **administratori**. Când un utilizator neautentificat vizitează landing-ul:

1. Query-ul pentru versiune returnează `[]` (array gol)
2. `VersionUpdateBanner` nu detectează nicio versiune nouă
3. Service Worker-ul continuă să servească bundle-ul vechi din cache

## Soluție Propusă

### Pasul 1: Adăugare Politică RLS Publică pentru `app_updates`

```sql
CREATE POLICY "Public can view published updates" 
ON app_updates 
FOR SELECT 
USING (status = 'published');
```

**Efect:** Toți utilizatorii (inclusiv vizitatori neautentificați) vor putea citi versiunile publicate, declanșând corect mecanismul de refresh.

### Pasul 2: Îmbunătățire `VersionUpdateBanner.tsx`

Adaug logging pentru debugging și un fallback pentru cazul în care query-ul eșuează:

```typescript
// Logging pentru debugging
console.log('[VersionBanner] DB version:', currentVersion, 'Local:', localVersion);

// Fallback: dacă nu putem citi din DB, verificăm BUILD_VERSION
if (!currentVersion && typeof window !== 'undefined') {
  const buildVersion = (window as any).BUILD_VERSION;
  // Compară cu versiunea din localStorage
}
```

### Pasul 3: Verificare și Curățare Politici Duplicate

Verific dacă există politici conflictuale sau duplicate pe `app_updates` și le curăț dacă e cazul.

## Fișiere Afectate

| Fișier/Resursă | Modificare |
|----------------|-----------|
| Migrație SQL | Adăugare politică RLS publică |
| `VersionUpdateBanner.tsx` | Logging + fallback îmbunătățit |

## Beneficii

- Utilizatorii neautentificați vor primi notificări de update
- Mecanismul de refresh va funcționa corect pentru toți
- Landing-ul vechi nu va mai apărea din cache

## Riscuri

- **Scăzut**: Politica expune doar câmpurile publice (version, status) ale update-urilor published
- **Niciun risc de securitate**: Nu se expun date sensibile

## Timp Estimat

~5 minute pentru implementare completă
