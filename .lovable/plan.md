
# Plan: Evidențiere text "5 conversații gratuite. Fără cont."

## Situația actuală
Textul se află pe **linia 77-79** în `src/pages/Landing.tsx`:
```tsx
<p className="text-xs text-muted-foreground">
  5 conversații gratuite. Fără cont.
</p>
```

## Soluția propusă

Transformăm textul într-un **badge vizual** păstrând dimensiunea fontului:

```tsx
<div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
  <span>🎁</span>
  <span>5 conversații gratuite. Fără cont.</span>
</div>
```

## Caracteristici vizuale
- **Background subtil**: `bg-primary/10` - fundal în culoarea primară cu opacitate 10%
- **Text colorat**: `text-primary` - textul în culoarea brand-ului
- **Font păstrat**: `text-xs` - dimensiunea originală menținută
- **Bold**: `font-medium` pentru greutate vizuală
- **Formă pill**: `rounded-full` pentru aspect modern
- **Emoji**: 🎁 pentru a atrage atenția instant
- **Padding**: `px-3 py-1.5` pentru spațiere confortabilă

## Fișier modificat
- `src/pages/Landing.tsx` - linia 77-79
