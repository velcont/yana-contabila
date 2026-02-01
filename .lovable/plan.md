
# Plan: Fix Scroll în DemoChat

## Problema identificată
Scroll-ul nu funcționează pentru că **Radix ScrollArea Viewport nu primește height explicit**. În componenta `scroll-area.tsx`, viewport-ul are doar `h-full w-full`, dar într-un layout flex, `h-full` fără un parent cu height explicit nu calculează corect.

## Soluția tehnică
Vom folosi aceeași abordare ca în `YanaChat.tsx` - **messagesEndRef + scrollIntoView** în loc de manipulare DOM directă. Această metodă e dovedită stabilă și nu depinde de quirks-urile Radix.

### Modificări în `src/components/demo/DemoChat.tsx`:

1. **Adăugare ref pentru scroll anchor**:
```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);
```

2. **Înlocuire logica scroll (liniile 75-81)**:
```tsx
// Scroll to bottom on new messages
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isLoading]);
```

3. **Adăugare div anchor după mesaje (după linia 273, înainte de închiderea `</div>` din space-y-4)**:
```tsx
<div ref={messagesEndRef} />
```

4. **Simplificare ScrollArea className** (opțional, pentru claritate):
```tsx
<ScrollArea className="flex-1 min-h-0">
```
Păstrăm `flex-1 min-h-0` care forțează flexbox să respecte max-height-ul părințelui.

## De ce funcționează
- `scrollIntoView()` forțează browser-ul să aducă elementul în vizor, indiferent de layoutul Radix
- Ref-ul `messagesEndRef` e întotdeauna la sfârșitul listei de mesaje
- `isLoading` în dependency array asigură scroll și când apare loader-ul

## Fișiere modificate
- `src/components/demo/DemoChat.tsx` - 4 modificări minore

## Risc
**Foarte scăzut** - e aceeași tehnică folosită în `YanaChat.tsx` și `ChatAI.tsx`, dovedită stabilă în producție.
