import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { formatCurrency, type FinancialData } from '@/services/financialAnalysis';

interface SourceDataCardProps {
  financialData: FinancialData;
  onScrollToChat: () => void;
}

export const SourceDataCard = React.memo(({ financialData, onScrollToChat }: SourceDataCardProps) => {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Date Sursă - Balanța Analizată
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verificat
              </Badge>
            </CardTitle>
            <CardDescription>
              Toate datele CFO Dashboard provin din această analiză. Verifică cu contabilul tău.
            </CardDescription>
          </div>
          <Button 
            onClick={onScrollToChat}
            size="sm"
            variant="outline"
            className="gap-2 ml-4"
          >
            💬 Sari la Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Principale Financiare */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Venituri */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-xs text-muted-foreground mb-1">💰 Cifra Afaceri</div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(financialData.revenue)}
            </div>
          </div>

          {/* Cheltuieli */}
          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-xs text-muted-foreground mb-1">📉 Cheltuieli</div>
            <div className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(financialData.expenses)}
            </div>
          </div>

          {/* Profit Net */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-muted-foreground mb-1">💼 Profit Net</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(financialData.profit)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Balanță / Lichidități */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💰 Balanță și Lichidități</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">🏦 Sold Bancă</span>
              <span className="font-semibold">{formatCurrency(financialData.soldBanca)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">💵 Sold Casă</span>
              <span className="font-semibold">{formatCurrency(financialData.soldCasa)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">👥 Creanțe (Clienți)</span>
              <span className="font-semibold">{formatCurrency(financialData.soldClienti)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">🔴 Datorii (Furnizori)</span>
              <span className="font-semibold">{formatCurrency(financialData.soldFurnizori)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Indicatori de Eficiență */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">📊 Indicatori de Eficiență</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">DSO (Days Sales Outstanding)</span>
              <span className="font-semibold">
                {financialData.dso > 0 ? `${financialData.dso.toFixed(0)} zile` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">DPO (Days Payable Outstanding)</span>
              <span className="font-semibold">
                {financialData.dpo > 0 ? `${financialData.dpo.toFixed(0)} zile` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            ⚠️ <strong>Disclaimer:</strong> Aceste date sunt extrase automat din ultima balanță încărcată. 
            Verifică cu contabilul pentru acuratețe. Nu reprezintă consultanță financiară certificată.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

SourceDataCard.displayName = 'SourceDataCard';
