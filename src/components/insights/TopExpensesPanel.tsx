import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingDown } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface TopExpensesPanelProps {
  expenses: ExpenseCategory[];
  totalExpenses: number;
  onBack: () => void;
  onStrategy: () => void;
}

// Mapare conturi clasa 6 la categorii mari
const EXPENSE_CATEGORIES: Record<string, { name: string; color: string }> = {
  '641': { name: 'Cheltuieli cu personalul', color: 'bg-red-500' },
  '645': { name: 'Cheltuieli cu personalul', color: 'bg-red-500' },
  '642': { name: 'Cheltuieli cu personalul', color: 'bg-red-500' },
  '607': { name: 'Cheltuieli cu mărfuri', color: 'bg-orange-500' },
  '604': { name: 'Cheltuieli cu materiale', color: 'bg-amber-500' },
  '605': { name: 'Cheltuieli cu materiale', color: 'bg-amber-500' },
  '611': { name: 'Servicii externalizate', color: 'bg-blue-500' },
  '612': { name: 'Servicii externalizate', color: 'bg-blue-500' },
  '613': { name: 'Chirii și utilități', color: 'bg-purple-500' },
  '614': { name: 'Chirii și utilități', color: 'bg-purple-500' },
  '621': { name: 'Servicii externalizate', color: 'bg-blue-500' },
  '622': { name: 'Servicii externalizate', color: 'bg-blue-500' },
  '623': { name: 'Servicii externalizate', color: 'bg-blue-500' },
  '624': { name: 'Transport', color: 'bg-teal-500' },
  '625': { name: 'Deplasări și protocol', color: 'bg-cyan-500' },
  '626': { name: 'Poștă și telecomunicații', color: 'bg-indigo-500' },
  '627': { name: 'Servicii bancare', color: 'bg-slate-500' },
  '628': { name: 'Alte servicii terți', color: 'bg-gray-500' },
  '635': { name: 'Impozite și taxe', color: 'bg-rose-500' },
  '658': { name: 'Alte cheltuieli', color: 'bg-zinc-500' },
  '665': { name: 'Cheltuieli cu dobânzi', color: 'bg-pink-500' },
  '666': { name: 'Cheltuieli cu dobânzi', color: 'bg-pink-500' },
  '681': { name: 'Amortizări', color: 'bg-stone-500' },
  '691': { name: 'Impozit pe profit', color: 'bg-red-600' },
};

// Funcție pentru a obține categoria unui cont
export const getExpenseCategory = (accountCode: string): { name: string; color: string } => {
  // Verifică primele 3 caractere
  const prefix3 = accountCode.substring(0, 3);
  if (EXPENSE_CATEGORIES[prefix3]) {
    return EXPENSE_CATEGORIES[prefix3];
  }
  
  // Verifică primele 2 caractere pentru categorii mai generale
  const prefix2 = accountCode.substring(0, 2);
  const generalCategories: Record<string, { name: string; color: string }> = {
    '60': { name: 'Cheltuieli cu stocuri', color: 'bg-orange-500' },
    '61': { name: 'Servicii externalizate', color: 'bg-blue-500' },
    '62': { name: 'Servicii terți', color: 'bg-blue-400' },
    '63': { name: 'Impozite și taxe', color: 'bg-rose-500' },
    '64': { name: 'Cheltuieli cu personalul', color: 'bg-red-500' },
    '65': { name: 'Alte cheltuieli operaționale', color: 'bg-zinc-500' },
    '66': { name: 'Cheltuieli financiare', color: 'bg-pink-500' },
    '67': { name: 'Cheltuieli extraordinare', color: 'bg-violet-500' },
    '68': { name: 'Amortizări și provizioane', color: 'bg-stone-500' },
    '69': { name: 'Impozit pe profit', color: 'bg-red-600' },
  };
  
  if (generalCategories[prefix2]) {
    return generalCategories[prefix2];
  }
  
  return { name: 'Alte cheltuieli', color: 'bg-gray-500' };
};

// Funcție pentru a calcula top 3 categorii de cheltuieli
export const calculateTopExpenses = (
  accounts: Array<{ code: string; name: string; debit: number; credit: number; accountClass: number }>
): { categories: ExpenseCategory[]; total: number } => {
  // Filtrează doar conturile de clasa 6 (cheltuieli)
  const expenseAccounts = accounts.filter(a => a.accountClass === 6);
  
  // Grupează pe categorii
  const categoryTotals: Record<string, { amount: number; color: string }> = {};
  
  expenseAccounts.forEach(account => {
    const category = getExpenseCategory(account.code);
    if (!categoryTotals[category.name]) {
      categoryTotals[category.name] = { amount: 0, color: category.color };
    }
    // Cheltuielile sunt în debit
    categoryTotals[category.name].amount += account.debit || 0;
  });
  
  // Calculează totalul cheltuielilor
  const total = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.amount, 0);
  
  // Sortează și ia top 3
  const sortedCategories = Object.entries(categoryTotals)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      color: data.color
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  
  return { categories: sortedCategories, total };
};

export const TopExpensesPanel = ({
  expenses,
  totalExpenses,
  onBack,
  onStrategy
}: TopExpensesPanelProps) => {
  // Formatare numere
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Găsește valoarea maximă pentru scalare bară
  const maxAmount = expenses.length > 0 ? Math.max(...expenses.map(e => e.amount)) : 0;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header cu buton înapoi */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi
        </Button>
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          🕳️ Top 3 Găuri Negre
        </h2>
      </div>

      {/* A. Titlu și subtitlu */}
      <div className="text-center space-y-1">
        <h3 className="text-xl font-semibold text-foreground">
          Cheltuieli care îți consumă cash-ul
        </h3>
        <p className="text-sm text-muted-foreground">
          Total cheltuieli: <span className="font-semibold">{formatMoney(totalExpenses)} RON</span>
        </p>
      </div>

      {/* B. Grafic cu bare verticale */}
      <Card>
        <CardContent className="p-6">
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nu am găsit cheltuieli în balanță</p>
            </div>
          ) : (
            <div className="flex items-end justify-center gap-6 md:gap-10 h-64">
              {expenses.map((expense, idx) => {
                const barHeight = maxAmount > 0 
                  ? Math.max((expense.amount / maxAmount) * 100, 15) 
                  : 50;
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-3 flex-1 max-w-32">
                    {/* Valoare deasupra barei */}
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-bold text-foreground">
                        {formatMoney(expense.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">RON</div>
                    </div>
                    
                    {/* Bara */}
                    <div 
                      className={`w-full rounded-t-lg ${expense.color} transition-all duration-1000 ease-out relative group`}
                      style={{ height: `${barHeight}%`, minHeight: '40px' }}
                    >
                      {/* Procentaj pe bară */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-lg md:text-xl drop-shadow-md">
                          {expense.percentage}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Numele categoriei sub bară */}
                    <div className="text-center">
                      <p className="text-xs md:text-sm font-medium text-foreground leading-tight">
                        {expense.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legendă explicativă */}
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground text-center">
          💡 <span className="font-medium">Insight:</span> Aceste 3 categorii reprezintă{' '}
          <span className="font-bold text-foreground">
            {expenses.reduce((sum, e) => sum + e.percentage, 0)}%
          </span>{' '}
          din totalul cheltuielilor tale.
        </p>
      </div>

      {/* D. Buton Final de Acțiune */}
      <Button
        onClick={onStrategy}
        className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 transition-all"
      >
        <span className="mr-2">💡</span>
        Am înțeles. Ce strategii am?
      </Button>
    </div>
  );
};
