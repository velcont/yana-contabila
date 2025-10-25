import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Finding {
  type: "critical" | "warning" | "info";
  category: "legal" | "financial" | "reputation" | "administrative";
  message: string;
  source: string;
  link?: string;
}

interface Verification {
  id: string;
  company_id: string;
  risk_score: number;
  risk_level: string;
  findings: Finding[];
  metadata: {
    cifValid: boolean;
    isActive: boolean;
    capitalSocial?: number;
    administrator?: string;
    companyStatus?: string;
    registrationDate?: string;
  };
  created_at: string;
}

interface ClientVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verification: Verification | null;
}

export const ClientVerificationDialog = ({
  open,
  onOpenChange,
  verification
}: ClientVerificationDialogProps) => {
  if (!verification) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low': return 'RISC SCĂZUT';
      case 'medium': return 'RISC MEDIU';
      case 'high': return 'RISC MARE';
      case 'critical': return 'RISC CRITIC';
      default: return 'NECUNOSCUT';
    }
  };

  const getRiskRecommendation = (level: string) => {
    switch (level) {
      case 'low':
        return 'Clientul prezintă un profil normal pentru colaborare. Monitorizează periodic pentru actualizări.';
      case 'medium':
        return 'Clientul prezintă unele semne de atenționare. Se recomandă verificări suplimentare și termeni de plată mai stricti.';
      case 'high':
        return 'Clientul prezintă multiple probleme. Se recomandă STRONGLY colaborarea cu avans 100% și clauze de protecție în contract.';
      case 'critical':
        return '🚨 RISC EXTREM! Se recomandă REFUZAREA contractului sau cerințe stricte: avans 100%, garanție bancară, audit complet.';
      default:
        return '';
    }
  };

  const getFindingIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'legal': return 'Legal';
      case 'financial': return 'Financiar';
      case 'reputation': return 'Reputație';
      case 'administrative': return 'Administrativ';
      default: return category;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Raport Verificare Due Diligence
          </DialogTitle>
          <DialogDescription>
            Verificat la: {new Date(verification.created_at).toLocaleString('ro-RO')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Risk Score Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Scor Risc</h3>
              <Badge variant={verification.risk_level === 'low' ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                {verification.risk_score}/100
              </Badge>
            </div>
            
            <Progress value={verification.risk_score} className="h-3" />
            
            <div className={`text-xl font-bold ${getRiskColor(verification.risk_level)}`}>
              {getRiskLabel(verification.risk_level)}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <h4 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informații Companie
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status CUI:</span>
                <span className="ml-2 font-medium">
                  {verification.metadata.cifValid ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Invalid
                    </Badge>
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status Activitate:</span>
                <span className="ml-2 font-medium">
                  {verification.metadata.isActive ? (
                    <Badge variant="default">ACTIV</Badge>
                  ) : (
                    <Badge variant="destructive">INACTIV</Badge>
                  )}
                </span>
              </div>
              {verification.metadata.companyStatus && (
                <div>
                  <span className="text-muted-foreground">Status Înregistrare:</span>
                  <span className="ml-2 font-medium">{verification.metadata.companyStatus}</span>
                </div>
              )}
              {verification.metadata.registrationDate && (
                <div>
                  <span className="text-muted-foreground">Data Înregistrare:</span>
                  <span className="ml-2 font-medium">{verification.metadata.registrationDate}</span>
                </div>
              )}
              {verification.metadata.administrator && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Administrator:</span>
                  <span className="ml-2 font-medium">{verification.metadata.administrator}</span>
                </div>
              )}
            </div>
          </div>

          {/* Findings Section */}
          <div className="space-y-3">
            <h4 className="font-semibold">Rezultate Verificare ({verification.findings.length})</h4>
            <div className="space-y-2">
              {verification.findings.map((finding, index) => (
                <Alert key={index} variant={finding.type === 'critical' ? 'destructive' : 'default'}>
                  <div className="flex items-start gap-3">
                    {getFindingIcon(finding.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(finding.category)}
                        </Badge>
                      </div>
                      <AlertDescription className="text-sm">
                        {finding.message}
                      </AlertDescription>
                      <div className="text-xs text-muted-foreground">
                        Sursă: {finding.source}
                        {finding.link && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 ml-2"
                            onClick={() => window.open(finding.link, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Vezi detalii
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>

          {/* Recommendation Section */}
          <Alert variant={verification.risk_level === 'critical' || verification.risk_level === 'high' ? 'destructive' : 'default'}>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="font-medium">
              <div className="font-semibold mb-1">📊 Recomandare:</div>
              {getRiskRecommendation(verification.risk_level)}
            </AlertDescription>
          </Alert>

          {/* Links Section */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <h4 className="font-semibold text-sm">🔗 Link-uri Verificare Externă</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://www.anaf.ro/PortalBilant/', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Portal ANAF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://portal.just.ro/', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Portal Instanțe
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://www.termene.ro/', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Termene.ro
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
