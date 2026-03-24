

# Plan: Integrare Conținut din Lucrarea Doctorală în YANA

## Context

Lucrarea de cercetare doctorală "Inovație digitală și modele de afaceri sustenabile - Transformarea rezilienței în avantaj competitiv" conține cadre conceptuale, terminologie academică și referințe bibliografice care pot fi integrate în YANA pentru a consolida legătura dintre aplicație și cercetarea doctorală.

## Ce se poate insera din lucrare

### 1. Cadrul Conceptual 4R vizualizat în Scorul de Reziliență
YANA deja calculează dimensiuni de reziliență (Anticipare, Coping, Adaptare, Robustețe, Redundanță, Resurse, Rapiditate), dar lucrarea introduce explicit **modelul 4R al lui Bruneau et al. (2003)**: Robustețe, Redundanță, Ingeniozitate, Rapiditate. Se poate adăuga un panel informativ sub scorul de reziliență care explică legătura academică.

**Modificare:** `ResilienceScoreCard.tsx` - adaugă un expandable section "Cadru Academic" care explică:
- Modelul 4R (Bruneau et al., 2003)
- Modelul capabilităților (Duchek, 2020)  
- Conexiunea antreprenor-firmă (Shepherd et al., 2015)

### 2. Secțiune "Despre Cercetare" în pagina About/Footer
Adaugă o pagină `/research` sau secțiune accesibilă din footer cu:
- Titlul tezei
- Cele 4 piloni: Reziliență Organizațională, Reziliență Antreprenorială, Transformare Digitală, Design Centrat pe Om
- Maparea funcționalităților YANA la concepte academice (exact cum e descris în lucrare, pag.8)
- Bibliografia selectivă (cele 40+ referințe)

### 3. Maparea Funcționalități → Concepte Academice în YANA Chat
Update la promptul YANA pentru a putea răspunde la întrebări despre fundamentul academic:
- War Room = Agilitate Strategică (Warner & Wager, 2019)
- Analiza Balanțe = Reducerea Sarcinii Cognitive (Norman, 2013; Baumeister et al., 2018)
- Scor Reziliență = Cuantificarea Rezilienței (Duchek, 2020; Linnenluecke, 2017)
- Battle Plan = Planificare Strategică Adaptivă (Teece, 2007)
- Suport Empatic = Suport Socio-Digital (Torres & Thurik, 2019)

**Modificare:** `yana-identity-contract.md` - adaugă secțiune de cunoștințe academice

### 4. Tooltip-uri Academice pe Funcționalitățile Cheie
Adaugă tooltip-uri discrete pe butoanele War Room, Battle Plan și Scorul de Reziliență care arată referința academică (ex: "Bazat pe Dynamic Capabilities Framework - Teece, 2007").

### 5. Export PDF "Cadru Conceptual" pentru prezentarea la conferințe
Adaugă opțiunea de a genera un PDF cu cadrul conceptual vizualizat, care mapează datele reale ale firmei la conceptele din lucrare - util pentru prezentări ICMEA.

## Detalii Tehnice

| Pas | Fișiere afectate | Complexitate |
|-----|-------------------|-------------|
| Cadru 4R în Reziliență | `ResilienceScoreCard.tsx` | Mică |
| Pagina /research | Nou: `src/pages/Research.tsx`, `App.tsx` (rută) | Medie |
| Update prompt YANA | `yana-identity-contract.md` | Mică |
| Tooltip-uri academice | `WarRoomSimulator.tsx`, `StrategicChart.tsx` | Mică |
| Export PDF cadru | Nou: `src/utils/generateResearchFrameworkPDF.ts` | Mare |

## Recomandare de prioritate

Pașii 1-3 sunt cei mai valoroși: consolidează poziționarea YANA ca "exemplu ilustrativ" în teză și oferă substanță academică vizibilă. Pasul 5 (PDF) e bonus pentru conferințe.

