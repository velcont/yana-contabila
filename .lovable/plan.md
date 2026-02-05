

# Plan: Redesign Mesaj Hard Refresh - Elegant și Complet

## Problema Curentă

Din screenshot se vede că mesajul actual este:
- Prea mare vizual (bold pe titlu, liste lungi)
- Lipsesc instrucțiunile pentru mobil
- Pare intruziv și forțat

## Soluția Propusă

Voi rescrie mesajul pentru a fi:
- **Mai mic și discret** - fără bold excesiv, text mai compact
- **Complet** - include și instrucțiuni mobile (iOS/Android)
- **Elegant** - integrat natural în salut, nu "în față"

## Textul Nou Propus

### Pentru utilizatori cu nume:
```
Salut, {userName}. Mă bucur să te văd din nou.

💡 Asigură-te că ai ultima versiune:
• Desktop: Ctrl+Shift+R (Win) · Cmd+Shift+R (Mac)
• Mobil: Trage în jos pentru refresh

Cu ce te pot ajuta azi?
```

### Pentru utilizatori fără nume:
```
Salut. Mă bucur că ai revenit.

💡 Asigură-te că ai ultima versiune:
• Desktop: Ctrl+Shift+R (Win) · Cmd+Shift+R (Mac)
• Mobil: Trage în jos pentru refresh

Cu ce te pot ajuta?
```

## Ce se schimbă

| Aspect | Înainte | După |
|--------|---------|------|
| Stil | Bold "**Înainte de orice...**" | Simplu cu emoji 💡 |
| Format | Liste cu emoji mari (🪟 🍎) | O linie compactă |
| Lungime | 5 linii | 3 linii |
| Mobile | Lipsea | "Trage în jos pentru refresh" |
| Ton | Imperativ ("te rog să faci") | Sugestiv ("Asigură-te") |

## Fișier Afectat

| Fișier | Modificare |
|--------|------------|
| `src/components/yana/YanaChat.tsx` | Actualizare `getWelcomeMessage()` liniile 499-515 |

## Beneficii

- ✅ Design mai curat și mai puțin intruziv
- ✅ Acoperă toate platformele (Windows, Mac, iOS, Android)
- ✅ Păstrează informația utilă într-un format compact
- ✅ Ton prietenos, nu imperativ

