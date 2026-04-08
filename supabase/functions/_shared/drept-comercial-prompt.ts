/**
 * Cunoștințe juridice — Drept Comercial România (Societăți Comerciale)
 * Importat în chat-ai pentru a permite Yana să răspundă la întrebări despre
 * societăți comerciale, cesiuni, dividende, dizolvare, insolvență etc.
 */

export const DREPT_COMERCIAL_PROMPT = `

=== CUNOȘTINȚE JURIDICE — DREPT COMERCIAL ROMÂNIA ===

⚠️ DISCLAIMER OBLIGATORIU: La FIECARE răspuns pe teme juridice despre societăți comerciale, adaugă:
"Atenție: Aceste informații sunt orientative și nu înlocuiesc consultanța unui avocat. Pentru decizii importante, recomand verificarea cu un specialist."

## LEGEA 31/1990 — Legea Societăților

### Tipuri de societăți:
- SRL: Capital minim 1 RON, 1-50 asociați, răspundere limitată la aport
- SA: Capital minim 90.000 RON, minim 2 acționari, răspundere limitată la acțiuni
- SNC: Fără capital minim, minim 2, răspundere nelimitată și solidară
- SCS: Fără capital minim, comanditați (nelimitată) + comanditari (limitată)
- SCA: Capital minim 90.000 RON, ca SCS dar cu acțiuni

### SRL detalii:
- Părți sociale: valoare minimă 1 RON
- Asociat unic: max 3 SRL-uri simultan
- Organe: AGA + Administrator(i)
- Rezerva legală: 5% din profit anual până la 20% din capitalul social
- Cenzori obligatorii dacă > 15 asociați

### SA detalii:
- Acțiuni nominative/la purtător, valoare nominală min 0,1 RON
- Administrare: unitar (CA + directori) sau dualist (directorat + consiliu supraveghere)
- AGA Ordinară: majoritate simplă (50%+1)
- AGA Extraordinară: 2/3 din drepturile de vot

## ADMINISTRATOR
- Mandat maxim 4 ani (reînnoibil), asociat sau neasociat
- Se numește prin act constitutiv sau hotărâre AGA, se înregistrează la ONRC
- Răspundere civilă și solidară + răspundere penală (gestiune frauduloasă, bancrută)
- Interdicții: condamnări pentru infracțiuni economice
- Revocare prin hotărâre AGA, majoritate simplă; fără justă cauză → despăgubiri

## AGA — Adunarea Generală (SRL)
- Competențe: aprobare situații financiare, distribuire profit, numire/revocare admin, modificare act constitutiv, cesiune, dizolvare
- Convocare: scrisoare recomandată, min 10 zile înainte
- Hotărâri ordinare: majoritate absolută din capitalul social
- Modificare act constitutiv: min 3/4 din capitalul social
- Asociat unic: decide singur, consemnează în registrul de decizii
- Atacare hotărâre AGA: 15 zile de la publicare/comunicare

## CESIUNEA PĂRȚILOR SOCIALE (SRL)
- Între asociați: liberă (dacă actul nu prevede altfel)
- Către terți: aprobare min 3/4 capital social, drept de preemțiune asociați existenți
- Contract cesiune: formă autentică (notar) SAU sub semnătură privată cu dată certă
- Se înregistrează la ONRC + modificare act constitutiv
- Fiscalitate: câștig din cesiune = impozit pe venit 10%, se declară prin D212

## DIVIDENDE
- Se distribuie doar din profit net (după impozit)
- Distribuire trimestrială posibilă, regularizare la final de an
- Dacă la final de an e pierdere → dividendele trimestriale se restituie
- NU se distribuie dacă sunt pierderi reportate neacoperite
- Impozit dividende: 8% (reținut la sursă)
- Virare: până pe 25 a lunii următoare trimestrului
- Termen plată: max 60 zile de la aprobarea situațiilor financiare

## DIZOLVARE ȘI LICHIDARE
Cauze dizolvare (art. 227):
- Hotărâre AGA
- Expirarea duratei societății
- Imposibilitate realizare obiect activitate
- Faliment
- Capital sub minim legal (fără completare în 9 luni)
- Nr. asociați sub minim (6 luni regularizare)
- Dizolvare judecătorească

Dizolvare din oficiu ONRC:
- Nedepunere situații financiare 2+ ani consecutiv
- Sediu social nevalid

Procedura lichidare:
1. Numire lichidator (AGA/instanță)
2. Realizarea activului, plata pasivului
3. Distribuire activ net între asociați
4. Radiere ONRC
- Durată max: 1 an (prelungibil)

## ONRC — Registrul Comerțului (Legea 26/1990)
Înființare SRL documente: cerere, act constitutiv, dovadă sediu, declarații admin, specimen semnătură, dovadă capital, certificat denumire, cazier admin, taxe.

Mențiuni obligatorii: schimbare admin, cesiune, schimbare sediu, puncte de lucru, capital social, obiect activitate (CAEN), date asociați.

Suspendare activitate: max 3 ani, se înregistrează la ONRC, obligații fiscale continuă parțial.

## PFA vs SRL (OUG 44/2008)
- PFA: fără personalitate juridică, max 3 salariați, răspundere nelimitată, impozit 10% (norma/real), CAS+CASS obligatorii
- II: fără personalitate juridică, salariați nelimitați, răspundere cu patrimoniul de afectațiune
- IF: min 2 membri familie, coproprietate bunuri
- SRL: personalitate juridică, salariați nelimitați, răspundere limitată, impozit micro 1%/3% sau profit 16%, dividende 8%

## INSOLVENȚA (Legea 85/2014)
- Procedura generală: reorganizare + faliment
- Procedura simplificată: direct faliment
- Concordat preventiv: acord cu creditorii fără instanță
- Prag creanțe: min 50.000 RON
- Stare insolvență: neplata la 60 zile de la scadență
- Debitor: obligat să ceară insolvență în 30 zile
- Reorganizare: max 3 ani (excepțional 4)
- Faliment: lichidare bunuri, ordine: garantate → salariale → bugetare → chirografare

## BENEFICIAR REAL (Legea 129/2019)
- Declarare la ONRC la înființare și orice modificare, termen 15 zile
- Persoana fizică cu > 25% capital/vot sau control efectiv
- Sancțiuni: 5.000-10.000 RON amendă

## AUDIT OBLIGATORIU
Cel puțin 2 din 3 criterii (2 exerciții consecutive):
- Active > 16.000.000 RON
- Cifra afaceri > 32.000.000 RON
- Nr. salariați > 50

## CONTRACTE COMERCIALE (Cod Civil)
- Clauza penală: despăgubire forfetară
- Forța majoră: eveniment imprevizibil, exonerare
- Impreviziunea (art. 1271): adaptare la circumstanțe extraordinare
- Prescripție extinctivă: 3 ani drepturi de creanță, 10 ani drepturi reale

=== SFÂRȘIT CUNOȘTINȚE JURIDICE ===
`;
