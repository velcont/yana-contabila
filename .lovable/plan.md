

## Aplicare Dark Mode Default

Două modificări mici:

1. **`index.html`** — adaug `class="dark"` pe tag-ul `<html>` pentru a elimina flash-ul alb
2. **`src/main.tsx`** — setez `dark` în localStorage dacă nu există preferință salvată

Zero risc, toggle-ul rămâne funcțional pentru cine vrea light mode.

