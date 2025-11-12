import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface AuditTrail {
  timestamp: string;
  validationsRun: boolean;
  columnsDetected?: {
    soldDebit: number;
    soldCredit: number;
    totalDebit: number;
    totalCredit: number;
  };
  detectionWarnings?: string[];
  balanceValidation?: {
    totalActiv: number;
    totalPasiv: number;
    diferenta: number;
    status: 'OK' | 'ERROR';
  };
  profitValidation?: {
    totalVenituri: number;
    totalCheltuieli: number;
    rezultatCalculat: number;
    rezultatCont121: number;
    diferenta: number;
    status: 'OK' | 'WARNING';
  };
  tvaValidation?: {
    tvColectata: number;
    tvDeductibila: number;
    tvDePlata: number;
    tvDeRecuperat: number;
    tvCalculat: number;
    status: string;
  };
}

interface BalanceAuditViewerProps {
  auditTrail: AuditTrail;
}

export function BalanceAuditViewer({ auditTrail }: BalanceAuditViewerProps) {
  const downloadCSV = () => {
    const rows: string[][] = [
      ['Verificare', 'Valoare', 'Status']
    ];
    
    if (auditTrail.balanceValidation) {
      rows.push(
        ['Total Activ', auditTrail.balanceValidation.totalActiv.toString(), ''],
        ['Total Pasiv', auditTrail.balanceValidation.totalPasiv.toString(), ''],
        ['Diferență Balanță', auditTrail.balanceValidation.diferenta.toString(), auditTrail.balanceValidation.status]
      );
    }
    
    if (auditTrail.profitValidation) {
      rows.push(
        ['Total Venituri', auditTrail.profitValidation.totalVenituri.toString(), ''],
        ['Total Cheltuieli', auditTrail.profitValidation.totalCheltuieli.toString(), ''],
        ['Rezultat Calculat', auditTrail.profitValidation.rezultatCalculat.toString(), ''],
        ['Cont 121', auditTrail.profitValidation.rezultatCont121.toString(), auditTrail.profitValidation.status]
      );
    }
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!auditTrail.validationsRun) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">🔍 Audit Trail - Validări Dezactivate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Validările avansate sunt dezactivate. Activează-le din setări pentru a vedea audit trail-ul complet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="default" className="bg-green-600">OK</Badge>;
      case 'WARNING':
        return <Badge variant="default" className="bg-yellow-600">ATENȚIE</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">EROARE</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">🔍 Audit Trail - Verificare Conformitate</CardTitle>
          </div>
          <Button onClick={downloadCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Descarcă CSV
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Verificări automate bazate pe Plan Contabil General România 2025
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validare Balanță */}
        {auditTrail.balanceValidation && (
          <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-r">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(auditTrail.balanceValidation.status)}
              <h3 className="font-semibold text-sm">Validare Echilibru Balanță (Activ = Pasiv)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">Total Activ:</div>
              <div className="font-mono font-medium">
                {auditTrail.balanceValidation.totalActiv.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">Total Pasiv:</div>
              <div className="font-mono font-medium">
                {auditTrail.balanceValidation.totalPasiv.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">Diferență:</div>
              <div className="font-mono font-medium flex items-center gap-2">
                {auditTrail.balanceValidation.diferenta.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                {getStatusBadge(auditTrail.balanceValidation.status)}
              </div>
            </div>
            {auditTrail.balanceValidation.status === 'OK' && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                ✅ Balanța este echilibrată conform standardelor contabile.
              </p>
            )}
            {auditTrail.balanceValidation.status === 'ERROR' && (
              <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                🔴 ATENȚIE: Balanța este NEECHILIBRATĂ! Verificați înregistrările contabile.
              </p>
            )}
          </div>
        )}
        
        {/* Validare Profit */}
        {auditTrail.profitValidation && (
          <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-r">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(auditTrail.profitValidation.status)}
              <h3 className="font-semibold text-sm">Validare Rezultat Financiar (Venituri - Cheltuieli = Cont 121)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">Venituri (clasa 7):</div>
              <div className="font-mono font-medium">
                {auditTrail.profitValidation.totalVenituri.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">Cheltuieli (clasa 6):</div>
              <div className="font-mono font-medium">
                {auditTrail.profitValidation.totalCheltuieli.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">Rezultat Calculat:</div>
              <div className="font-mono font-medium">
                {auditTrail.profitValidation.rezultatCalculat.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">Sold Cont 121:</div>
              <div className="font-mono font-medium flex items-center gap-2">
                {auditTrail.profitValidation.rezultatCont121.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                {getStatusBadge(auditTrail.profitValidation.status)}
              </div>
              <div className="text-muted-foreground">Diferență:</div>
              <div className="font-mono font-medium">
                {auditTrail.profitValidation.diferenta.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
            </div>
            {auditTrail.profitValidation.status === 'OK' && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                ✅ Rezultatul financiar este corect calculat și concordant cu contul 121.
              </p>
            )}
            {auditTrail.profitValidation.status === 'WARNING' && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                ⚠️ Există o diferență mică între rezultatul calculat și contul 121. Verificați regularizările.
              </p>
            )}
          </div>
        )}
        
        {/* Validare TVA */}
        {auditTrail.tvaValidation && (
          <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 dark:bg-purple-950/20 rounded-r">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(auditTrail.tvaValidation.status)}
              <h3 className="font-semibold text-sm">Validare TVA (Colectată - Deductibilă = De Plată)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">TVA Colectată (4427):</div>
              <div className="font-mono font-medium">
                {Math.abs(auditTrail.tvaValidation.tvColectata).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">TVA Deductibilă (4426):</div>
              <div className="font-mono font-medium">
                {Math.abs(auditTrail.tvaValidation.tvDeductibila).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">TVA de Plată (calculat):</div>
              <div className="font-mono font-medium">
                {Math.abs(auditTrail.tvaValidation.tvCalculat).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <div className="text-muted-foreground">TVA de Plată (cont 4423):</div>
              <div className="font-mono font-medium flex items-center gap-2">
                {Math.abs(auditTrail.tvaValidation.tvDePlata).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                {getStatusBadge(auditTrail.tvaValidation.status)}
              </div>
              {auditTrail.tvaValidation.tvDeRecuperat > 0 && (
                <>
                  <div className="text-muted-foreground">TVA de Recuperat (4424):</div>
                  <div className="font-mono font-medium">
                    {Math.abs(auditTrail.tvaValidation.tvDeRecuperat).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-2">
              ℹ️ Verificați concordanța cu Declarația D394 depusă la ANAF.
            </p>
          </div>
        )}

        {/* Columns Detected - Debugging Info */}
        {auditTrail.columnsDetected && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              📊 Coloane Detectate în Excel (Debug Info)
            </h4>
            
            {/* ✅ R3: Afișează warning-uri explicit */}
            {auditTrail.detectionWarnings && auditTrail.detectionWarnings.length > 0 && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-700 rounded">
                {auditTrail.detectionWarnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-800 dark:text-yellow-300">
                    {warning}
                  </p>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rulaje/Total Debitoare:</span>
                <Badge 
                  variant={auditTrail.columnsDetected.totalDebit >= 0 ? "default" : "destructive"} 
                  className="ml-2 font-mono"
                >
                  {auditTrail.columnsDetected.totalDebit >= 0 
                    ? `Col ${auditTrail.columnsDetected.totalDebit}` 
                    : "NEDETECTAT"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rulaje/Total Creditoare:</span>
                <Badge 
                  variant={auditTrail.columnsDetected.totalCredit >= 0 ? "default" : "destructive"} 
                  className="ml-2 font-mono"
                >
                  {auditTrail.columnsDetected.totalCredit >= 0 
                    ? `Col ${auditTrail.columnsDetected.totalCredit}` 
                    : "NEDETECTAT"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sold Final Debitor:</span>
                <Badge 
                  variant={auditTrail.columnsDetected.soldDebit >= 0 ? "default" : "outline"} 
                  className="ml-2 font-mono"
                >
                  {auditTrail.columnsDetected.soldDebit >= 0 
                    ? `Col ${auditTrail.columnsDetected.soldDebit}` 
                    : "Nedetectat"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sold Final Creditor:</span>
                <Badge 
                  variant={auditTrail.columnsDetected.soldCredit >= 0 ? "default" : "outline"} 
                  className="ml-2 font-mono"
                >
                  {auditTrail.columnsDetected.soldCredit >= 0 
                    ? `Col ${auditTrail.columnsDetected.soldCredit}` 
                    : "Nedetectat"}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
              ℹ️ Indexii coloanelor Excel detectați automat pentru extragerea corectă a datelor (fallback pe 2 rânduri pentru Rulaje totale/Total sume ȘI Solduri finale).
            </p>
          </div>
        )}

        {/* Info timestamp */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>Validări executate la: {new Date(auditTrail.timestamp).toLocaleString('ro-RO')}</p>
          <p className="mt-1">
            Bazat pe <strong>Plan Contabil General România 2025</strong> și <strong>Codul Fiscal actualizat</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
