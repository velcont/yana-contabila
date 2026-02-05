

# Plan: Mesaj Automat de la YANA la Conversații Noi

## Ce Vrei

1. **Textul exact** cu 🔄 și "Gata? Hai să începem!"
2. **Mesaj real în chat** de la YANA (nu text static sus)
3. **Doar la conversații noi** - nu la cele existente/reluate

## Ideea Ta

Excelentă! Avantaje:
- ✅ Se simte ca o conversație reală (YANA vorbește prima)
- ✅ Nu e un element UI static, ci parte din flow-ul natural
- ✅ Utilizatorii existenți care revin la o conversație veche nu văd mesajul repetat
- ✅ Aliniată cu modelul Companion (YANA inițiază dialogul)

## Cum Va Arăta

```
┌─────────────────────────────────────────┐
│  [Y] YANA                               │
│                                         │
│  Salut, Miki! Mă bucur să te văd din    │
│  nou. 😊                                │
│                                         │
│  🔄 Actualizează pagina pentru ultima   │
│  versiune:                              │
│  Desktop: Ctrl+Shift+R (Win) ·          │
│           Cmd+Shift+R (Mac)             │
│  Mobil: Trage în jos pentru refresh     │
│                                         │
│  Gata? Hai să începem! Cu ce te pot     │
│  ajuta azi?                             │
└─────────────────────────────────────────┘

        [ Input utilizator... ]
```

## Modificări Tehnice

| Fișier | Modificare |
|--------|------------|
| `src/components/yana/YanaChat.tsx` | 1. Elimin `welcomeMessage` din UI-ul static<br>2. La conversații noi, adaug automat un mesaj de tip "assistant" în array-ul `messages` |

## Logica de Decizie

```
Conversație nouă (activeConversationId === null)?
  → DA: Inserez mesajul YANA automat la început
  → NU: Încarc mesajele existente (fără mesaj automat)
```

## Textul Final (Pentru Utilizatori Existenți)

**Cu nume:**
```
Salut, {userName}! Mă bucur să te văd din nou. 😊

🔄 Actualizează pagina pentru ultima versiune:
Desktop: Ctrl+Shift+R (Win) · Cmd+Shift+R (Mac)
Mobil: Trage în jos pentru refresh

Gata? Hai să începem! Cu ce te pot ajuta azi?
```

**Fără nume:**
```
Salut! Mă bucur că ai revenit. 😊

🔄 Actualizează pagina pentru ultima versiune:
Desktop: Ctrl+Shift+R (Win) · Cmd+Shift+R (Mac)
Mobil: Trage în jos pentru refresh

Gata? Hai să începem! Cu ce te pot ajuta?
```

## Notă Importantă

Acest mesaj automat NU va fi salvat în baza de date - este doar un mesaj de întâmpinare vizual. Când utilizatorul trimite primul mesaj, conversația se creează normal în DB.

## Beneficii

- ✅ Experiență conversațională autentică
- ✅ Nu repetă mesajul la conversații existente
- ✅ Ton prietenos cu "Gata? Hai să începem!"
- ✅ Include instrucțiuni complete (Win/Mac/Mobil)

