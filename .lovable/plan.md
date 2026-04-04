

# Plan: Adăugare cunoștințe Velcont în baza de date Yana

## Ce facem
Adăugăm informațiile despre colaborarea cu Velcont (FAQ SmartBill/Zoom, tarife, proces de onboarding, linkuri) în promptul de identitate al Yanei, astfel încât să poată răspunde corect la orice întrebare despre serviciile de contabilitate.

## Unde se adaugă
Fișierul `supabase/functions/_shared/prompts/yana-identity-contract.md` — la final, ca secțiune nouă dedicată.

## Secțiunea nouă: "Colaborare Velcont — FAQ Contabilitate Online"

Se adaugă o secțiune structurată care include:

1. **Descrierea sistemului de lucru** — contabilitate digitalizată prin Zoom + SmartBill, susținut de AI și CRM
2. **Video de prezentare** — link YouTube: `https://youtu.be/ZtkqiPIIhAw`
3. **Oferta de test** — 3 luni gratuit, întâlniri lunare Zoom, închidere balanțe, depunere declarații
4. **Tarife post-test:**
   - Fără TVA: 250 RON/lună
   - TVA trimestrial: 330 RON/lună
   - TVA lunar: 350 RON/lună
   - +25 EUR/lună pentru 1-5 angajați
5. **FAQ complet** (arhivare, SmartBill, verificare documente, compatibilitate eMAG/Amazon)
6. **Link programare evaluare** — `https://api.leadconnectorhq.com/widget/booking/7355vpWtqN56kZEbOU4N`
7. **Contact** — velcont.com (WhatsApp), office@velcont.com
8. **Semnătura** — Suciu Gyorfi Nicolae

## Reguli de răspuns pentru Yana
Se adaugă instrucțiuni clare:
- Când cineva întreabă despre tarife/colaborare/contabilitate → răspunde din aceste date
- Recomandă întotdeauna video-ul de prezentare ca prim pas
- Menționează perioada de test de 3 luni gratuit
- Direcționează spre linkul de programare pentru evaluare
- Nu inventează tarife sau condiții care nu sunt listate

## Modificări tehnice
- **1 fișier editat**: `supabase/functions/_shared/prompts/yana-identity-contract.md` — append secțiune nouă (~60 linii)
- **Redeploy**: Edge functions care folosesc acest prompt (`chat-ai`, `consult-yana`, `yana-brain`) se vor actualiza automat la deploy

