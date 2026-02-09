
# Fix: DocumentUploader nu acceptă imagini

## Problema
Modificările din planul anterior nu au fost aplicate efectiv pe fișierul `DocumentUploader.tsx`. Componenta încă acceptă doar Excel, PDF și Word - lipsesc formatele de imagine (PNG, JPG, WEBP).

## Ce trebuie modificat

### 1. `src/components/yana/DocumentUploader.tsx`

**Accept attribute** (linia 147):
- De la: `accept=".xlsx,.xls,.pdf,.doc,.docx"`
- La: `accept=".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"`

**Procesare imagini** (in functia `processFile`):
- Adaug o ramura pentru extensiile `png`, `jpg`, `jpeg`, `webp`
- Imaginile se convertesc in base64 via `readAsDataURL()` (functia exista deja)

**Iconita de imagine** in zona de drop:
- Import `Image` din lucide-react
- Adaug o a treia iconita albastra langa cele de Excel si Word

**Text formate acceptate** (linia 165):
- Actualizat la: "Formate acceptate: Excel, PDF, Word, Imagini (PNG, JPG, WEBP)"

### 2. Verificare `YanaChat.tsx`
- Ma asigur ca thumbnail-ul imaginii se afiseaza corect in conversatie (verificare daca modificarile anterioare au fost aplicate)

## Detalii tehnice

Singura modificare este in `DocumentUploader.tsx`:

```text
Linia 2:   + import { Image } din lucide-react
Linia 41:  + ramura noua pentru ['png','jpg','jpeg','webp'] -> readAsDataURL(file)
Linia 127: + iconita Image albastra
Linia 147: accept attribute actualizat cu formate imagine
Linia 165: text actualizat cu "Imagini (PNG, JPG, WEBP)"
```

Nu sunt necesare modificari la edge functions - `analyze-image` si `ai-router` sunt deja deployate si functionale.
