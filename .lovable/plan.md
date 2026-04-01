

# Upgrade Document Generation Engine la nivel "Aria Tools"

## Situație curentă vs. Ce vrei

YANA **deja are** ~80% din funcționalitate: DOCX, XLSX, PPTX, PDF (create + merge), email delivery, intent detection, Storage + signed URLs. Ce **lipsește** sunt câteva capabilități din spec-ul Aria:

| Funcționalitate Aria | Status YANA | Acțiune |
|---|---|---|
| `generate_excel` cu sheets/formule/styling | ✅ Implementat | Mic refactor prompt AI |
| `generate_docx` cu template letterhead/report/notification | ✅ Implementat | Adăugare template-uri dedicate |
| `generate_pdf` create/merge/convert_from_docx | ✅ create + merge | Adăugare mod `fill_form` + `convert_from_docx` |
| `generate_pptx` | ✅ Implementat | — |
| `read_document` — citire + clasificare inteligentă | ⚠️ Parțial (doar balanțe) | **Upgrade major**: citire orice PDF/Excel/Word |
| `send_whatsapp_file` | ❌ Nu se aplică (YANA e web) | Înlocuit cu email delivery (existent) |
| Proactive document generation | ❌ Nu există | Edge function scheduler |
| AI tool-calling cu structured params | ❌ AI generează text liber | **Upgrade**: AI returnează JSON structurat |

## Plan de implementare

### Pas 1: AI Structured Tool Calling pentru documente
**Fișier**: `supabase/functions/generate-office-document/index.ts`

Upgrade-ul `generateDocumentContent()` — în loc să cerem AI-ului text liber, îi cerem parametri structurați specifici per tip de document:

- Pentru **DOCX**: AI returnează `{ filename, template, content: [{type, text, bold, items, headers, rows}], footer }`
- Pentru **XLSX**: AI returnează `{ filename, sheets: [{name, headers, rows, formulas, column_widths}], styling }`
- Pentru **PPTX**: AI returnează `{ filename, slides: [{layout, title, content, notes}] }`

Asta înseamnă prompt-uri separate per document type, cu schema JSON explicită.

### Pas 2: Template-uri dedicate DOCX
**Fișier**: `supabase/functions/generate-office-document/index.ts`

Adăugare template-uri concrete:
- **`letterhead`**: Header cu logo placeholder, adresă firmă, CUI, footer cu paginare
- **`client_notification`**: Bloc destinatar (Către, Firma, CUI), linie subiect, bloc semnătură cu nume/funcție
- **`report`**: Pagină de titlu, secțiuni structurate, rezumat executiv
- **`contract`**: Articole numerotate, clauze standard, bloc semnături bilateral

### Pas 3: Citire documente inteligentă (read_document)
**Fișier**: `supabase/functions/ai-router/index.ts`

Când user-ul uploadează un PDF/Word/Excel care NU e balanță:
- Extrage textul din document (deja parțial implementat)  
- Trimite la AI cu prompt de clasificare: "Ce tip de document e? Rezumă conținutul cheie."
- Răspuns contextual: "Am primit factura de la X, suma Y, din data Z."

### Pas 4: PDF fill_form mode
**Fișier**: `supabase/functions/generate-office-document/index.ts`

Adăugare mod `fill_form` cu `pdf-lib`:
- Primește `template_path` (din Storage) + `fields` (key-value)
- Completează câmpurile AcroForm din PDF-ul template
- Util pentru formulare ANAF sau documente standard

### Pas 5: Prompt-uri AI îmbunătățite per template
**Fișier**: `supabase/functions/generate-office-document/index.ts`

Prompt-uri specifice per `templateType`:
- **contract**: Include articole standard (părți, obiect, durată, preț, obligații, confidențialitate, reziliere, forță majoră, litigii, dispoziții finale) + disclaimer juridic
- **propunere/ofertă**: Structură comercială (context, soluție, beneficii, preț, timeline)
- **raport**: Rezumat executiv, detalii, concluzii, acțiuni
- **factura**: Atenționare că NU înlocuiește SmartBill, dar poate genera un draft vizual

### Pas 6: Proactive document suggestions
**Fișier**: `supabase/functions/ai-router/index.ts`

După analiză balanță, Yana sugerează automat:
- "Pot genera un raport Word cu analiza completă"
- "Vrei un Excel cu situația pe conturi?"

(Asta deja e parțial implementat via SuggestionChips)

## Detalii tehnice

### Structura nouă a prompt-ului AI per document type

```typescript
// Contract prompt
`Generează un contract profesional în format JSON structurat.
Schema: {
  "title": "Contract de [tip]",
  "sections": [
    { "heading": "ARTICOLUL 1 – PĂRȚILE", "content": "...", "type": "text" },
    { "heading": "ARTICOLUL 2 – OBIECTUL", "content": "...", "type": "list" },
    ...
  ]
}
OBLIGATORIU: Ultima secțiune = disclaimer că e draft, necesită verificare avocat.`
```

### Fill form PDF (nou)
```typescript
async function fillPdfForm(supabase, templatePath, fields): Promise<Uint8Array> {
  const { PDFDocument } = await import("npm:pdf-lib@1.17.1");
  // Download template → load → getForm() → fill fields → save
}
```

## Fișiere afectate
1. `supabase/functions/generate-office-document/index.ts` — Upgrade prompt-uri, template-uri, fill_form
2. `supabase/functions/ai-router/index.ts` — Transmite balanceContext la document generation, îmbunătățește clasificare upload-uri non-balanță
3. `supabase/functions/_shared/prompts/chat-ai-prompt.md` — Actualizare instrucțiuni despre capabilități documente

## Ce NU implementăm (nu se aplică)
- WhatsApp integration (YANA e web-based)
- OCR pe imagini (ar necesita Tesseract, nu e disponibil în Deno)
- Malware scanning (Supabase Storage gestionează asta)

