# Ghid de Testare - Yana

## 🧪 Setup Testare

Proiectul folosește **Vitest** pentru teste și **React Testing Library** pentru testarea componentelor React.

### Rulare Teste

```bash
# Rulează toate testele
npm test

# Rulează testele în watch mode
npm run test:watch

# Rulează testele cu UI
npm run test:ui

# Generează raport de coverage
npm run test:coverage
```

### Scripts package.json

Adaugă în `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 📁 Structura Testelor

```
src/
├── components/
│   ├── MyComponent.tsx
│   └── __tests__/
│       └── MyComponent.test.tsx
├── utils/
│   ├── myUtil.ts
│   └── __tests__/
│       └── myUtil.test.ts
├── hooks/
│   ├── useMyHook.tsx
│   └── __tests__/
│       └── useMyHook.test.tsx
└── test/
    └── setup.ts
```

## ✍️ Cum să Scrii Teste

### 1. Teste pentru Componente React

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyButton from '../MyButton';

describe('MyButton', () => {
  it('should render with text', () => {
    render(<MyButton>Click me</MyButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<MyButton onClick={handleClick}>Click me</MyButton>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<MyButton disabled>Click me</MyButton>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### 2. Teste pentru Custom Hooks

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

### 3. Teste pentru Utilități

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../formatters';

describe('formatCurrency', () => {
  it('should format number as RON currency', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56 RON');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('0,00 RON');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-100,00 RON');
  });
});
```

### 4. Teste Asincrone

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DataFetcher from '../DataFetcher';

describe('DataFetcher', () => {
  it('should display loading state', () => {
    render(<DataFetcher />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display data after loading', async () => {
    render(<DataFetcher />);
    
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

### 5. Mockuri

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock API call
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'test' })),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// Mock Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: '123' }),
}));
```

## 🎯 Best Practices

### 1. Testează Comportament, Nu Implementare

```typescript
// ❌ BAD - testează detalii de implementare
it('should have correct className', () => {
  const { container } = render(<Button />);
  expect(container.firstChild).toHaveClass('btn-primary');
});

// ✅ GOOD - testează comportament
it('should be clickable', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Click</Button>);
  fireEvent.click(screen.getByText('Click'));
  expect(onClick).toHaveBeenCalled();
});
```

### 2. Folosește Queries Semantice

```typescript
// ❌ BAD
const button = container.querySelector('.btn');

// ✅ GOOD
const button = screen.getByRole('button', { name: /submit/i });
```

### 3. Organizează Testele Logico

```typescript
describe('MyComponent', () => {
  describe('rendering', () => {
    it('should render with default props', () => {});
    it('should render with custom props', () => {});
  });

  describe('interactions', () => {
    it('should handle click', () => {});
    it('should handle keyboard input', () => {});
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {});
    it('should handle errors', () => {});
  });
});
```

### 4. Cleanup Automat

Setup-ul nostru face cleanup automat după fiecare test:

```typescript
// În src/test/setup.ts
afterEach(() => {
  cleanup();
});
```

## 📊 Coverage

### Target-uri Recomandate

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Verificare Coverage

```bash
npm run test:coverage
```

Raportul HTML va fi generat în `coverage/index.html`.

## 🚨 Ce să Testezi

### Prioritate Înaltă
- ✅ Logică de business critică
- ✅ Componente UI reutilizabile
- ✅ Utilități și funcții helper
- ✅ Custom hooks
- ✅ Validări și transformări de date
- ✅ Integrări cu API-uri externe

### Prioritate Medie
- ✅ Componente de pagină
- ✅ Formulare și validări
- ✅ State management
- ✅ Routing logic

### Prioritate Scăzută
- ⚠️ Componente simple de prezentare
- ⚠️ Stiluri CSS (testează cu Storybook sau visual regression)
- ⚠️ Third-party library wrappers

## 🔧 Troubleshooting

### Module Resolution Errors

Asigură-te că ai alias-ul configurat în `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Canvas/Image Errors

Adaugă mock în `src/test/setup.ts`:

```typescript
HTMLCanvasElement.prototype.getContext = vi.fn();
```

### Supabase Errors

Mockuiește Supabase în testele tale:

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}));
```

## 📚 Resurse

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest UI](https://vitest.dev/guide/ui.html)

## 🎓 Exemple Avansate

### Testing Context Providers

```typescript
import { render } from '@testing-library/react';
import { ThemeContext } from '@/contexts/ThemeContext';

const renderWithTheme = (component: React.ReactElement, theme = 'dark') => {
  return render(
    <ThemeContext.Provider value={{ theme, setTheme: vi.fn() }}>
      {component}
    </ThemeContext.Provider>
  );
};

it('should render with dark theme', () => {
  renderWithTheme(<MyComponent />, 'dark');
  // assertions
});
```

### Testing with React Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQuery = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  );
};
```
