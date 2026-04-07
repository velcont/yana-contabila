

# Fix: UX mobil Yana + butonul "Conversație nouă"

## Probleme identificate

### 1. Pagina Auth — conținut tăiat pe mobil
Pe screenshot se vede clar: textul "Partenerul tău AI de business" și cardurile cu beneficii sunt tăiate pe stânga. Cauza: containerul are `mx-2` dar nu are padding suficient, iar cardurile grid nu se adaptează pe ecrane mici (<380px).

### 2. Chat Yana — layout mobil aglomerat  
- Banner-ul "NOU — Yana generează Word/Excel" ocupă spațiu valoros pe mobil
- Onboarding flow + suggestion chips + credits banner + input area = prea multe elemente suprapuse în zona de jos
- Inputul de text și butoanele sunt prea înghesuite

### 3. Butonul "Conversație nouă" nu funcționează
Când apeși "Conversație nouă" pe mobil:
- `onNewConversation()` setează `activeConversationId = null`
- Sidebar-ul se închide (`onClose`)
- Dar `welcomeMessageShown` rămâne `true` din conversația anterioară
- Effect-ul de welcome verifică `conversationId === null && messages.length === 0` — dar mesajele vechi nu sunt șterse imediat
- **Fix**: resetarea stării `welcomeMessageShown` + ștergerea mesajelor trebuie să fie sincronă cu `onNewConversation`

## Modificări planificate

### Fișier 1: `src/pages/Auth.tsx`
- Adăugare padding lateral mai mare pe mobil (`px-4` în loc de `px-2`)
- Grid beneficii: `grid-cols-1` pe ecrane sub 380px, `grid-cols-2` pe rest
- Titlu h1: reducere font-size pe mobil mic

### Fișier 2: `src/components/yana/YanaChat.tsx`
- **Fix "Conversație nouă"**: În useEffect-ul care monitorizează `conversationId`, când devine `null`, forțează `setMessages([])` și `setWelcomeMessageShown(false)` sincron
- Ascunde `SuggestionChips` pe mobil când onboarding-ul este activ
- Reduce padding-ul zonei de input pe mobil

### Fișier 3: `src/components/yana/OfficeFeatureAnnouncement.tsx`
- Ascunde complet pe mobil sau fă-l mai compact (o singură linie)

### Fișier 4: `src/components/yana/ConversationSidebar.tsx`
- La click pe "Conversație nouă" pe mobil, apelează `onClose()` automat după `onNewConversation()`

### Fișier 5: `src/pages/Yana.tsx`
- Actualizare `handleNewConversation` pentru a închide sidebar-ul pe mobil automat

