
# Plan: Remediere Conflict Chei Versiune

## Problema Identificată

Există un conflict între două sisteme de versiuni care folosesc aceeași cheie `yana_db_version`:

| Script | Ce scrie în localStorage | Exemplu |
|--------|--------------------------|---------|
| `index.html` | `BUILD_VERSION` (timestamp) | `v1769953356507` |
| `VersionUpdateBanner.tsx` | Versiune din DB (semantică) | `4.0.0.1` |

**Rezultat:** Banner-ul de actualizare apare **permanent** deoarece comparația `4.0.0.1 !== v1769953356507` este mereu adevărată.

## Soluție Propusă

Separăm cele două sisteme folosind **chei diferite** în localStorage:

| Cheie | Scop | Folosită de |
|-------|------|-------------|
| `yana_build_version` | Timestamp build PWA | `index.html` |
| `yana_db_version` | Versiune semantică din DB | `VersionUpdateBanner.tsx` |

## Pași de Implementare

### Pasul 1: Modificare `index.html`

Schimbăm cheia folosită de scriptul de cache busting:

```javascript
// ÎNAINTE
var VERSION_KEY = 'yana_db_version';

// DUPĂ
var VERSION_KEY = 'yana_build_version';
```

Acest lucru va face ca:
- Scriptul din `index.html` să folosească `yana_build_version` pentru timestamp-uri
- `VersionUpdateBanner.tsx` să continue să folosească `yana_db_version` pentru versiuni semantice

### Pasul 2: Verificare `VersionUpdateBanner.tsx`

Confirmăm că componenta folosește corect `yana_db_version` și nu citește din cheia greșită.

### Pasul 3: Migrare Date Vechi (Opțional)

Adăugăm un script de curățare care:
1. Verifică dacă `yana_db_version` conține un timestamp (prefix `v`)
2. Dacă da, îl șterge pentru a permite sincronizarea corectă

## Diagrama Fluxului Corectat

```text
┌──────────────────┐     ┌──────────────────┐
│   index.html     │     │ VersionBanner    │
│                  │     │                  │
│ BUILD_VERSION    │     │ DB Query         │
│ (timestamp)      │     │ (semantic)       │
│        │         │     │        │         │
│        ▼         │     │        ▼         │
│ yana_build_ver   │     │ yana_db_version  │
│ (v176995335...)  │     │ (4.0.0.1)        │
└──────────────────┘     └──────────────────┘
        ↓                        ↓
   Cache busting           Afișare banner
   (PWA refresh)           (doar când DB > local)
```

## Fișiere Afectate

| Fișier | Modificare |
|--------|------------|
| `index.html` | Schimbă `VERSION_KEY` la `yana_build_version` |
| `VersionUpdateBanner.tsx` | Adaugă logică de curățare a valorilor invalide |

## Beneficii

1. Cele două sisteme funcționează independent
2. Banner-ul apare DOAR când versiunea din DB se schimbă efectiv
3. Cache busting-ul PWA continuă să funcționeze normal
4. Se rezolvă loop-ul infinit de afișare a banner-ului

## Riscuri și Mitigare

- **Risc scăzut**: Utilizatorii existenți pot avea `yana_db_version` cu valoare invalidă
- **Mitigare**: Adăugăm validare care șterge valorile cu prefix `v` și permite sincronizarea corectă

## Timp Estimat

~3 minute pentru implementare completă
