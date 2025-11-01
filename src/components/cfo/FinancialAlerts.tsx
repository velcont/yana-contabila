import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Alert as FinancialAlert } from '@/services/financialAnalysis';

interface FinancialAlertsProps {
  alerts: FinancialAlert[];
  onScrollToChat: () => void;
  companyName?: string;
}

export const FinancialAlerts = React.memo(({ alerts, onScrollToChat, companyName }: FinancialAlertsProps) => {
  if (alerts.length === 0) return null;

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Alerte Financiare ({alerts.length})
              {companyName && (
                <Badge variant="outline" className="text-xs font-normal text-foreground">
                  {companyName}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Probleme detectate automat care necesită atenție
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
      <CardContent className="space-y-3">
        {alerts.map((alert, idx) => (
          <Alert 
            key={idx}
            className={cn(
              "border-2",
              alert.severity === 'critical' && "border-red-500 bg-red-50 dark:bg-red-950",
              alert.severity === 'warning' && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
              alert.severity === 'info' && "border-blue-500 bg-blue-50 dark:bg-blue-950"
            )}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">{alert.title}</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>{alert.message}</p>
              {alert.actionable && alert.actionable.length > 0 && (
                <div>
                  <p className="font-semibold mt-2">Acțiuni recomandate:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {alert.actionable.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
});

FinancialAlerts.displayName = 'FinancialAlerts';
