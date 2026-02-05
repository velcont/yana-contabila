

# Plan: Mesaj Automat de la YANA la Conversații Noi

## ✅ IMPLEMENTAT

1. ✅ **Textul exact** cu 🔄 și "Gata? Hai să începem!"
2. ✅ **Mesaj real în chat** de la YANA (nu text static sus)
3. ✅ **Doar la conversații noi** - nu la cele existente/reluate

## Ce s-a schimbat

- Eliminat UI-ul static `welcomeMessage` (era centrat sus cu icon Y mare)
- Adăugat mesaj automat de tip "assistant" în array-ul `messages` pentru conversații noi
- Quick Actions (Analiză financiară, Sfat strategic, etc.) sunt acum în mesajul YANA
- Mesajul apare ca o bulă de chat normală de la YANA

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

## Logica de Decizie

```
Conversație nouă (activeConversationId === null)?
  → DA: Inserez mesajul YANA automat la început
  → NU: Încarc mesajele existente (fără mesaj automat)
```

## Textul Implementat

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

## Beneficii

- ✅ Experiență conversațională autentică
- ✅ Nu repetă mesajul la conversații existente
- ✅ Ton prietenos cu "Gata? Hai să începem!"
- ✅ Include instrucțiuni complete (Win/Mac/Mobil)
- ✅ Mesajul NU este salvat în DB - doar vizual

