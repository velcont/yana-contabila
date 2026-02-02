
# Plan: Transformare "Spune-i ce te frământă" în Input Vizual Clar

## 1. Problema Identificată

Utilizatorii nu înțeleg că zona "Spune-i ce te frământă" este interactivă și pot scrie acolo. Aceasta se întâmplă pentru că:

- **Design actual**: Este un `<Button>` standard cu text static
- **Nu arată ca un input**: Lipsesc indiciile vizuale (placeholder, cursor, bordură de input)
- **Percepție**: Utilizatorii cred că e un buton care face ceva, nu un loc de scriere

---

## 2. Soluția Propusă

Transformăm butonul într-un **"fake input"** (input imitator) care:
- Arată ca un câmp de text unde poți scrie
- Are cursor care clipește pentru a atrage atenția
- Include placeholder animat/dinamic
- La click, deschide DemoChat și focalizează automat inputul

---

## 3. Modificări Planificate

### Fișier: `src/pages/Landing.tsx`

**Înainte (liniile 68-76):**
```tsx
<Button 
  variant="outline" 
  size="lg"
  className="w-full gap-2"
  onClick={handleDemoClick}
>
  <MessageCircle className="w-4 h-4" />
  Spune-i ce te frământă
</Button>
```

**După:**
```tsx
<button
  onClick={handleDemoClick}
  className="w-full flex items-center gap-3 px-4 py-4 
             bg-card border-2 border-primary/30 rounded-xl
             hover:border-primary hover:shadow-lg
             transition-all duration-300 group text-left"
>
  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
    <MessageCircle className="w-5 h-5 text-primary" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-1 text-muted-foreground">
      <span className="truncate">Scrie ce te frământă...</span>
      <span className="animate-pulse">|</span>
    </div>
    <p className="text-xs text-muted-foreground/60 mt-0.5">
      Click pentru a vorbi cu Yana
    </p>
  </div>
</button>
```

### Fișier: `src/index.css` (opțional)

Adăugare animație cursor care clipește:
```css
@keyframes blink-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.animate-cursor-blink {
  animation: blink-cursor 1s infinite;
}
```

---

## 4. Beneficii UX

| Aspect | Înainte | După |
|--------|---------|------|
| **Vizual** | Buton standard | Arată ca un input |
| **Indicator scriere** | Lipsă | Cursor clipind |
| **Text helper** | Lipsă | "Click pentru a vorbi" |
| **Call to action** | Ambiguu | Clar: scrie aici |
| **Hover feedback** | Minimal | Border + shadow |

---

## 5. Alternativă Avansată (Opțională)

Dacă vrei să mergi mai departe, putem adăuga:

1. **Placeholder rotativ** - textul se schimbă automat:
   - "Ce te ține treaz noaptea?"
   - "Ai o întrebare despre cifre?"
   - "Spune-mi ce te preocupă..."

2. **Typing animation** - textul se "scrie" singur pentru a arăta că poți scrie

---

## 6. Secțiune Tehnică

### Fișiere afectate:
- `src/pages/Landing.tsx` - modificare buton demo

### Dependențe:
- Niciuna nouă necesară

### Timp implementare estimat:
- ~15 minute

### Compatibilitate:
- Mobile-first (design responsive)
- Accessibility: păstrăm `button` semantic pentru keyboard navigation
- Touch-friendly: zona de atingere mărită (py-4)
