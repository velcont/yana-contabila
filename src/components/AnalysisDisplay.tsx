import { useState } from 'react';
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Building,
  Calendar,
  FileText,
  DollarSign,
  Percent,
  Clock,
  Coins,
  Activity,
  Package,
  Users,
  CreditCard,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnalysisDisplayProps {
  analysisText: string;
  fileName?: string;
  createdAt?: string;
}

interface FinancialIndicator {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'critical' | 'warning' | 'good' | 'neutral';
  icon: any;
  category: 'profitability' | 'liquidity' | 'efficiency' | 'alert';
}

export const AnalysisDisplay = ({ analysisText, fileName, createdAt }: AnalysisDisplayProps) => {
  // Parse company info
  const extractCompanyInfo = (text: string) => {
    const cuiMatch = text.match(/CUI[:\s]+(\d+)/i);
    const companyMatch = text.match(/\*\*([^*]+(?:SRL|SA|SCS|SNC|PFA)[^*]*)\*\*/i);
    const periodMatch = text.match(/Perioada analizată[:\s]+([^\n]+)/i);
    
    return {
      name: companyMatch?.[1]?.trim() || 'Firmă',
      cui: cuiMatch?.[1] || 'N/A',
      period: periodMatch?.[1]?.trim() || 'N/A'
    };
  };

  // Extract financial indicators from text
  const extractIndicators = (text: string): FinancialIndicator[] => {
    const indicators: FinancialIndicator[] = [];

    // Profitabilitate
    const profitMatch = text.match(/Profit net[^:]*:\s*([0-9,.-]+)\s*RON/i);
    if (profitMatch) {
      const value = parseFloat(profitMatch[1].replace(/,/g, ''));
      indicators.push({
        title: 'Profit Net',
        value: `${profitMatch[1]} RON`,
        trend: value > 0 ? 'up' : 'down',
        severity: value > 0 ? 'good' : 'critical',
        icon: DollarSign,
        category: 'profitability'
      });
    }

    // Marja netă
    const marjaNetaMatch = text.match(/Marja netă %[^=]*=\s*([0-9.,-]+)%/i);
    if (marjaNetaMatch) {
      const value = parseFloat(marjaNetaMatch[1].replace(/,/g, ''));
      indicators.push({
        title: 'Marja Netă',
        value: `${marjaNetaMatch[1]}%`,
        severity: value > 15 ? 'good' : value > 5 ? 'warning' : 'critical',
        icon: Percent,
        category: 'profitability'
      });
    }

    // EBITDA
    const ebitdaMatch = text.match(/EBITDA estimat[^=]*=\s*([0-9,.-]+)\s*RON/i);
    if (ebitdaMatch) {
      const value = parseFloat(ebitdaMatch[1].replace(/,/g, ''));
      indicators.push({
        title: 'EBITDA Estimat',
        value: `${ebitdaMatch[1]} RON`,
        trend: value > 0 ? 'up' : 'down',
        severity: value > 0 ? 'good' : 'critical',
        icon: Activity,
        category: 'profitability'
      });
    }

    // Cash disponibil
    const cashMatch = text.match(/Cash disponibil[^:]*:\s*([0-9,.-]+)\s*RON/i);
    if (cashMatch) {
      indicators.push({
        title: 'Cash Disponibil',
        value: `${cashMatch[1]} RON`,
        severity: 'good',
        icon: Coins,
        category: 'liquidity'
      });
    }

    // Current Ratio
    const currentRatioMatch = text.match(/Current Ratio[^:]*:\s*([0-9.,-]+|Nu se poate calcula[^\n]*)/i);
    if (currentRatioMatch) {
      const value = currentRatioMatch[1];
      const isNumber = !isNaN(parseFloat(value));
      indicators.push({
        title: 'Current Ratio',
        value: isNumber ? value : 'N/A',
        severity: isNumber ? (parseFloat(value) > 1.5 ? 'good' : 'warning') : 'neutral',
        icon: CreditCard,
        category: 'liquidity'
      });
    }

    // DSO
    const dsoMatch = text.match(/DSO[^=]*=\s*([0-9.,-]+)\s*zile/i);
    if (dsoMatch) {
      const value = parseFloat(dsoMatch[1].replace(/,/g, ''));
      indicators.push({
        title: 'DSO (Zile Încasări)',
        value: `${dsoMatch[1]} zile`,
        severity: value < 45 ? 'good' : value < 60 ? 'warning' : 'critical',
        icon: Clock,
        category: 'efficiency'
      });
    }

    // DPO
    const dpoMatch = text.match(/DPO[^=]*=\s*([0-9.,-]+)\s*zile/i);
    if (dpoMatch) {
      indicators.push({
        title: 'DPO (Zile Plăți)',
        value: `${dpoMatch[1]} zile`,
        severity: 'neutral',
        icon: Users,
        category: 'efficiency'
      });
    }

    // DIO
    const dioMatch = text.match(/DIO[^=]*=\s*([0-9.,-]+)\s*zile/i);
    if (dioMatch) {
      indicators.push({
        title: 'DIO (Rotație Stocuri)',
        value: `${dioMatch[1]} zile`,
        severity: 'neutral',
        icon: Package,
        category: 'efficiency'
      });
    }

    // Cash Conversion Cycle
    const cccMatch = text.match(/Cash Conversion Cycle[^=]*=\s*([0-9.,-]+)\s*zile/i);
    if (cccMatch) {
      const value = parseFloat(cccMatch[1].replace(/,/g, ''));
      indicators.push({
        title: 'Cash Conversion Cycle',
        value: `${cccMatch[1]} zile`,
        severity: value < 45 ? 'good' : value < 90 ? 'warning' : 'critical',
        icon: Zap,
        category: 'efficiency'
      });
    }

    // Extract alerts
    const alertMatches = text.match(/🚨[^.\n]+|⚠️[^.\n]+/gi);
    if (alertMatches && alertMatches.length > 0) {
      indicators.push({
        title: 'Alerte Critice',
        value: `${alertMatches.length} alertă${alertMatches.length > 1 ? '' : ''}`,
        severity: 'critical',
        icon: AlertCircle,
        category: 'alert'
      });
    }

    return indicators;
  };

  const companyInfo = extractCompanyInfo(analysisText);
  const indicators = extractIndicators(analysisText);

  // Group indicators by category
  const profitabilityIndicators = indicators.filter(i => i.category === 'profitability');
  const liquidityIndicators = indicators.filter(i => i.category === 'liquidity');
  const efficiencyIndicators = indicators.filter(i => i.category === 'efficiency');
  const alertIndicators = indicators.filter(i => i.category === 'alert');

  const getSeverityStyles = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/5 hover:bg-yellow-500/10';
      case 'good':
        return 'border-green-500/50 bg-green-500/5 hover:bg-green-500/10';
      default:
        return 'border-border bg-card hover:bg-muted/50';
    }
  };

  const IndicatorCard = ({ indicator }: { indicator: FinancialIndicator }) => {
    const Icon = indicator.icon;
    return (
      <Card className={`transition-all duration-300 ${getSeverityStyles(indicator.severity)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Icon className="h-5 w-5 opacity-70" />
            {indicator.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
            {indicator.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
          <CardTitle className="text-sm font-medium opacity-80 mt-2">
            {indicator.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{indicator.value}</div>
          {indicator.change && (
            <p className="text-xs text-muted-foreground mt-1">{indicator.change}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Company Info Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building className="h-6 w-6 text-primary" />
                {companyInfo.name}
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span><strong>CUI:</strong> {companyInfo.cui}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span><strong>Perioadă:</strong> {companyInfo.period}</span>
                </div>
                {fileName && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-xs" title={fileName}>{fileName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts Section - Priority Display */}
      {alertIndicators.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Alerte & Riscuri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertIndicators.map((indicator, idx) => (
              <IndicatorCard key={`alert-${idx}`} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {/* Profitability Section */}
      {profitabilityIndicators.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Profitabilitate
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {profitabilityIndicators.map((indicator, idx) => (
              <IndicatorCard key={`profit-${idx}`} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {/* Liquidity Section */}
      {liquidityIndicators.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Lichiditate
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liquidityIndicators.map((indicator, idx) => (
              <IndicatorCard key={`liquid-${idx}`} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {/* Efficiency Section */}
      {efficiencyIndicators.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Eficiență Operațională
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {efficiencyIndicators.map((indicator, idx) => (
              <IndicatorCard key={`eff-${idx}`} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {/* Full Analysis - Collapsible */}
      <Card className="border-border">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Analiză Completă Detaliată
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {analysisText}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sursa Datelor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Analiză generată automat cu AI pe baza balanței de verificare.
            {createdAt && ` • ${new Date(createdAt).toLocaleDateString('ro-RO', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};