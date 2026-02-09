

# Funcționalitate nouă: YANA citește capturi de ecran

## Ce se va implementa

YANA va putea primi imagini (capturi de ecran, fotografii) direct in chat, le va trimite către un model AI cu capabilități vizuale (Gemini 2.5 Flash - multimodal), iar YANA va analiza conținutul imaginii și va răspunde la întrebările identificate.

## Fluxul utilizatorului

1. Utilizatorul apasă butonul "+" din chat-ul YANA
2. Selectează o imagine (PNG, JPG, WEBP)
3. Opțional, scrie un mesaj asociat (ex: "Răspunde la întrebările din această captură")
4. YANA primește imaginea, o analizează și generează răspunsuri

## Modificări tehnice

### 1. DocumentUploader - suport imagini
- Se adaugă formate acceptate: `.png, .jpg, .jpeg, .webp`
- Imaginile se convertesc în base64 (data URL) similar cu PDF-urile
- Se afișează iconița de imagine lângă cele de Excel/Word
- Accept attribute actualizat: `accept=".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"`

### 2. AI Router - rută nouă pentru imagini
- Detectare `fileType` de tip imagine (`image/png`, `image/jpeg`, etc.)
- Rutare către un nou handler care trimite imaginea către Lovable AI Gateway cu model multimodal (`google/gemini-2.5-flash`)
- Imaginea se trimite ca `image_url` în mesajul utilizatorului (format OpenAI-compatible)

### 3. Edge Function nouă: `analyze-image` (sau logică inline în ai-router)
- Primește imaginea base64 + mesajul utilizatorului
- Construiește un prompt cu personalitatea YANA
- Trimite către `https://ai.gateway.lovable.dev/v1/chat/completions` cu model `google/gemini-2.5-flash`
- Mesajul include conținut multimodal: text + image_url
- Returnează analiza textului din imagine + răspunsuri la întrebări identificate

### 4. YanaChat - afișare imagini în conversație
- Mesajele utilizatorului cu imagini vor afișa un thumbnail al imaginii
- Răspunsul YANA se afișează normal cu Markdown

### 5. Prompt specific pentru analiza de capturi WhatsApp
- System prompt va instrui YANA să:
  - Identifice întrebările din conversație
  - Răspundă la fiecare în ordine
  - Formateze răspunsurile pentru copy-paste ușor în WhatsApp
  - Folosească tonul caracteristic YANA (informal, clar, fără jargon excesiv)

## Exemplu de payload trimis la Lovable AI Gateway

```text
{
  model: "google/gemini-2.5-flash",
  messages: [
    { role: "system", content: "Ești YANA, asistent financiar-contabil..." },
    { role: "user", content: [
        { type: "text", text: "Răspunde la întrebările din captură" },
        { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
    ]}
  ]
}
```

## Fișiere afectate

| Fișier | Acțiune |
|--------|---------|
| `src/components/yana/DocumentUploader.tsx` | Modificat - adaug suport imagini |
| `src/components/yana/YanaChat.tsx` | Modificat - afișare thumbnail imagine + mesaj implicit |
| `supabase/functions/ai-router/index.ts` | Modificat - detectare tip imagine și rutare |
| `supabase/functions/analyze-image/index.ts` | NOU - edge function pentru analiza vizuală |

## Estimare cost per utilizare
- ~0.02-0.05 RON per captură de ecran (Gemini 2.5 Flash cu imagine)
