# Ghid de Contribuție - Yana

Mulțumim pentru interesul în contribuirea la Yana! 🎉

## 📋 Cuprins

- [Code of Conduct](#code-of-conduct)
- [Cum să Contribui](#cum-să-contribui)
- [Setup Development](#setup-development)
- [Standards de Cod](#standards-de-cod)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Arhitectura Proiectului](#arhitectura-proiectului)

## Code of Conduct

### Comportament Așteptat

- Fii respectuos și profesionist
- Acceptă feedback constructiv
- Concentrează-te pe ce e mai bun pentru comunitate
- Manifestă empatie față de alți membri

### Comportament Inacceptabil

- Limbaj ofensator sau discriminatoriu
- Hărțuire în orice formă
- Troleală sau comentarii instigatoare
- Publicarea de informații private ale altora

## Cum să Contribui

### Raportare Bug-uri

Când raportezi un bug, include:

1. **Descriere clară** a problemei
2. **Pași de reproducere** detaliați
3. **Comportament așteptat** vs comportament actual
4. **Screenshots** (dacă e relevant)
5. **Environment**: Browser, OS, versiune

**Template Bug Report:**

```markdown
## Descriere
[Descriere clară a bug-ului]

## Pași de Reproducere
1. Mergi la '...'
2. Click pe '...'
3. Scroll până la '...'
4. Vezi eroarea

## Comportament Așteptat
[Ce ar trebui să se întâmple]

## Comportament Actual
[Ce se întâmplă de fapt]

## Screenshots
[Dacă este cazul]

## Environment
- Browser: [Chrome 120]
- OS: [Windows 11]
- Versiune: [1.0.0]
```

### Sugestii de Feature-uri

Pentru feature-uri noi:

1. **Verifică** dacă nu există deja un issue similar
2. **Descrie** detaliat feature-ul dorit
3. **Explică** beneficiile și use cases
4. **Propune** o implementare (opțional)

**Template Feature Request:**

```markdown
## Feature Description
[Descriere clară a feature-ului]

## Problem to Solve
[Ce problemă rezolvă acest feature]

## Proposed Solution
[Cum ai implementa acest feature]

## Alternatives Considered
[Alte soluții la care te-ai gândit]

## Additional Context
[Screenshots, mockups, etc.]
```

## Setup Development

### Prerequisites

```bash
Node.js >= 18.x
npm >= 9.x
Git
```

### Instalare Locală

```bash
# Clone repository
git clone https://github.com/your-org/yana.git
cd yana

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Editează .env cu credențialele tale

# Start development server
npm run dev
```

### Structura de Branch-uri

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Noi feature-uri
- `fix/*`: Bug fixes
- `hotfix/*`: Urgent fixes pentru production

### Workflow Git

```bash
# Creează branch nou
git checkout -b feature/nume-feature

# Fă modificările tale
# ...

# Commit cu mesaj descriptiv
git add .
git commit -m "feat: adaugă funcționalitate X"

# Push la remote
git push origin feature/nume-feature

# Creează Pull Request pe GitHub
```

## Standards de Cod

### TypeScript

```typescript
// ✅ GOOD
interface User {
  id: string;
  email: string;
  name?: string;
}

const getUser = async (id: string): Promise<User> => {
  // implementation
};

// ❌ BAD
const getUser = async (id) => {
  // no types
};
```

### React Components

```typescript
// ✅ GOOD - Component funcțional cu TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  onClick, 
  children 
}) => {
  return (
    <button 
      className={buttonVariants({ variant })}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// ❌ BAD - Fără types, inline styles
const Button = ({ variant, onClick, children }) => {
  return (
    <button style={{ color: 'white' }} onClick={onClick}>
      {children}
    </button>
  );
};
```

### Naming Conventions

```typescript
// Components: PascalCase
const UserProfile = () => {};

// Hooks: camelCase cu prefix 'use'
const useAuth = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Functions: camelCase
const calculateTotal = () => {};

// Files:
// - Components: PascalCase (UserProfile.tsx)
// - Hooks: camelCase (useAuth.tsx)
// - Utils: camelCase (formatDate.ts)
```

### Design System

**CRITICAL: Folosește întotdeauna tokens semantice!**

```typescript
// ✅ GOOD - Semantic tokens
<Button variant="primary">Click</Button>
<Card className="bg-background text-foreground">

// ❌ BAD - Direct colors
<Button className="bg-blue-500 text-white">Click</Button>
<Card className="bg-white text-black">
```

### Import Organization

```typescript
// 1. React & external libraries
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal imports - aliases
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 3. Types
import type { User } from '@/types';

// 4. Relative imports (evită dacă e posibil)
import { helper } from './utils';
```

### Code Style

```typescript
// Use arrow functions
const add = (a: number, b: number) => a + b;

// Destructure when possible
const { user, loading } = useAuth();

// Use template literals
const message = `Hello, ${user.name}!`;

// Use optional chaining
const email = user?.profile?.email;

// Use nullish coalescing
const name = user.name ?? 'Guest';

// Prefer const over let
const count = 5;

// Use meaningful variable names
const isUserLoggedIn = true; // not: const flag = true;
```

## Testing

### Scrie Teste pentru

- ✅ Noi componente UI
- ✅ Custom hooks
- ✅ Utility functions
- ✅ Business logic
- ✅ API integrations

### Test Structure

```typescript
describe('Component/Function Name', () => {
  describe('specific functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui
```

### Coverage Requirements

- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Pull Request Process

### Înainte de Pull Request

- [ ] Code-ul buildează fără erori
- [ ] Toate testele trec
- [ ] Ai adăugat teste pentru cod nou
- [ ] Ai actualizat documentația
- [ ] Code-ul urmează standardele de stil
- [ ] Ai făcut self-review

### Pull Request Template

```markdown
## Description
[Descriere clară a modificărilor]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
[Cum ai testat modificările]

## Screenshots
[Dacă e relevant]

## Checklist
- [ ] Code builds without errors
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Self-review completed
```

### Review Process

1. **Create PR** cu descriere completă
2. **Automated checks** trebuie să treacă (tests, lint)
3. **Code review** de către maintainers
4. **Adresează feedback**-ul
5. **Approve & Merge**

### Commit Message Format

Folosim [Conventional Commits](https://www.conventionalcommits.org/):

```bash
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat`: Nou feature
- `fix`: Bug fix
- `docs`: Doar documentație
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code refactoring
- `test`: Adăugare teste
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(auth): adaugă autentificare cu Google
fix(dashboard): rezolvă crash la încărcare date
docs(readme): actualizează instrucțiuni instalare
refactor(utils): simplifică logica de validare
test(hooks): adaugă teste pentru useAuth
```

## Arhitectura Proiectului

Citește [ARCHITECTURE.md](./ARCHITECTURE.md) pentru:
- Structura proiectului
- Patterns și best practices
- Database schema
- API endpoints
- State management

## Documentation

### Documentează

- Componente complexe (JSDoc)
- Utility functions (JSDoc)
- Custom hooks (JSDoc)
- API endpoints
- Database schema changes

### JSDoc Example

```typescript
/**
 * Calculează totalul comenzii cu taxe
 * @param subtotal - Subtotal fără taxe
 * @param taxRate - Rata taxei (0.19 pentru 19%)
 * @returns Total cu taxe incluse
 * @example
 * calculateTotal(100, 0.19) // returns 119
 */
export const calculateTotal = (
  subtotal: number, 
  taxRate: number
): number => {
  return subtotal * (1 + taxRate);
};
```

## Resurse Utile

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Docs](https://supabase.com/docs)
- [Testing Guide](./TESTING_GUIDE.md)
- [Architecture Guide](./ARCHITECTURE.md)

## Întrebări?

Dacă ai întrebări sau ai nevoie de ajutor:

1. Verifică [documentația existentă](./README.md)
2. Caută în [Issues](https://github.com/your-org/yana/issues)
3. Creează un [Discussion](https://github.com/your-org/yana/discussions)
4. Contactează maintainers

## Licență

Contribuind la Yana, ești de acord că contribuțiile tale vor fi licențiate sub aceeași licență ca și proiectul.

---

**Mulțumim pentru contribuție! 🚀**
