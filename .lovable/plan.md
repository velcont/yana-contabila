

# Fix: Weekly Check-in — Yana trimite email cu placeholdere [brackets]

## Problema

Funcția `weekly-companion-checkin` generează emailuri personalizate cu Gemini Flash Lite. Când un utilizator nu are context de business sau conversații anterioare, modelul pune placeholdere de tipul `[un aspect specific din discuția anterioară]` în loc să scrie ceva concret.

Cauza: promptul nu interzice explicit bracket placeholders și nu oferă instrucțiuni clare pentru cazul în care datele lipsesc.

## Soluția

### Fișier: `supabase/functions/weekly-companion-checkin/index.ts`

**1. Îmbunătățire prompt AI (linia 124-128):**
- Adaugă regulă explicită: `NU folosi NICIODATĂ paranteze pătrate [...] sau placeholdere. Scrie DOAR text concret.`
- Adaugă instrucțiune: `Dacă nu ai informații despre business-ul lor, pune o întrebare generală dar concretă (ex: "Cum merge cu vânzările luna asta?", "Ai reușit să angajezi pe cineva?").`
- Adaugă: `NU menționa că nu știi detalii despre ei. Scrie natural, ca și cum ai fi un prieten care se interesează.`

**2. Validare output AI (după linia 148):**
- După generarea mesajului, verifică dacă conține `[` sau `]` — dacă da, skip acest email (nu-l trimite)
- Log warning pentru monitorizare

**3. Îmbunătățire context user (liniile 132-135):**
- Când `businessContext` e gol, nu trimite `necunoscut` — trimite `Nu avem detalii despre business. Pune o întrebare generală despre antreprenoriat.`
- Când `lastTopics` e gol, trimite `Nu au discutat subiecte specifice recent. Întreabă cum le merge în general.`

## Rezultat
Emailurile vor fi întotdeauna naturale, fără brackets, chiar și pentru utilizatori noi fără context.

