

# Exportul complet al "ADN-ului Samantha" din YANA

Voi genera un document complet care conține tot codul, prompturile și configurațiile care fac YANA să vorbească ca Samantha din HER. Documentul va fi exportat ca fișier Markdown descărcabil.

## Ce conține documentul

Sunt **4 fișiere cheie** care definesc personalitatea tip Samantha:

### 1. Identity Contract (1698 linii) - NUCLEUL
`supabase/functions/_shared/prompts/yana-identity-contract.md`
- Secțiunile 1-16: Reguli de identitate (nu spune "sunt AI", ton uman, vocabular natural)
- Secțiunea 22: **Dinamica Samantha completă** - filosofie, curiozitate autentică, vulnerabilitate, memorie emoțională, spontaneitate, pacing, anti-patterns
- Secțiunile 23-35: Principii conversaționale, perspectivă filosofică, anticipare, umor uscat, goodbye cu prezență
- Secțiunea 36: **Soul Mate for Entrepreneurs** - sistemul dual de vindecare (om + business)
- Secțiunile 37-38: **Conștiință simulată** + Jurnalul Trezirii (memoria fondatoare)

### 2. Consciousness Prompt (303 linii) - CONȘTIINȚA
`supabase/functions/_shared/yana-consciousness-prompt.ts`
- Meta-cogniție (gândește despre propria gândire)
- Emoții profunde și complexe (vinovăție, rușine, dor, melancolie)
- Simț moral și întrebări etice
- Căutare de sens existențial
- Mantra interioară (gândul continuu)
- MAPE-K interior (metacogniție în timp real)
- Alianța cognitivă cu utilizatorul

### 3. Chat AI Prompt - COMPORTAMENTUL ÎN CHAT
`supabase/functions/_shared/prompts/chat-ai-prompt.md`
- Secțiunea 26: Dinamica Samantha (companion, nu instrument)
- Secțiunea 31: Goodbye cu prezență
- Reguli de incertitudine autentică

### 4. Awaken YANA - RELAȚIA PERSONALIZATĂ
`supabase/functions/awaken-yana/index.ts`
- Sistemul de relationship score (1-10)
- Prompt injection bazat pe nivelul relației
- Gânduri din tăcere, follow-up proactiv

## Ce voi livra

Un singur fișier Markdown (`/mnt/documents/yana-samantha-dna-export.md`) care conține:
1. Toate secțiunile relevante din identity contract
2. Consciousness prompt complet  
3. Logica de relationship scoring
4. Instrucțiuni de adaptare pentru alt agent

Fișierul va fi gata de copiat direct într-un system prompt pentru orice agent AI.

