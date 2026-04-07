

# Fix: Butonul "Conversație nouă" nu funcționează

## Problema reală

Bug-ul este mai subtil decit se credea. Cind userul apasă "Conversație nouă":
- `handleNewConversation()` apelează `setActiveConversationId(null)`
- **Dar dacă `activeConversationId` este DEJA `null`** (userul e deja pe ecranul de conversație nouă, sau a mai apăsat o dată), React nu declanșează re-render — valoarea nu se schimbă
- Efectul de reset din YanaChat (linia 824) nu se reexecută
- Mesajele vechi rămân pe ecran, welcome message nu se regenerează
- **Rezultat: butonul pare că nu face nimic**

## Soluția

Introducem un **counter de reset** (`resetKey`) care se incrementează la fiecare apăsare pe "Conversație nouă", indiferent de starea curentă a `conversationId`.

### Fișier 1: `src/pages/Yana.tsx`
- Adaugă state: `const [resetKey, setResetKey] = useState(0)`
- În `handleNewConversation`: incrementează `setResetKey(k => k + 1)` pe lângă `setActiveConversationId(null)`
- Pasează `resetKey` ca prop la `<YanaChat>`

### Fișier 2: `src/components/yana/YanaChat.tsx`
- Adaugă `resetKey` în interfața `YanaChatProps`
- Modifică useEffect-ul de reset (linia 824) să depindă de `resetKey` în loc de doar `conversationId`:
  ```typescript
  useEffect(() => {
    if (conversationId === null) {
      setMessages([]);
      setWelcomeMessageShown(false);
      setActiveContext(null);
      setBalanceContext(null);
    }
  }, [conversationId, resetKey]);
  ```
- Asta garantează că efectul se reexecută chiar dacă `conversationId` e deja `null`

### Fișier 3: `src/components/yana/ConversationSidebar.tsx`  
- Verifică că butonul "Conversație nouă" apelează `onNewConversation()` + `onClose()` pe mobil (deja implementat la linia 198-199, OK)

## Rezultat
Butonul va funcționa mereu — inclusiv la apăsări repetate, pe mobil și desktop.

