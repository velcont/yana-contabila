import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldAlert, ShieldCheck, AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientVerificationDialog } from './ClientVerificationDialog';

interface Company {
  id: string;
  company_name: string;
  cif: string;
  cui: string;
}

interface Verification {
  id: string;
  company_id: string;
  risk_score: number;
  risk_level: string;
  findings: any[];
  metadata: any;
  created_at: string;
}

interface ClientDueDiligenceProps {
  clients: Company[];
  onRefresh?: () => void;
}

export const ClientDueDiligence = ({ clients, onRefresh }: ClientDueDiligenceProps) => {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, [clients]);

  const fetchVerifications = async () => {
    try {
      const companyIds = clients.map(c => c.id);
      if (companyIds.length === 0) return;

      const { data, error } = await supabase
        .from('client_verification_history')
        .select('*')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Keep only the latest verification for each company
      const latestVerifications: Record<string, Verification> = {};
      data?.forEach(verification => {
        if (!latestVerifications[verification.company_id]) {
          latestVerifications[verification.company_id] = verification as Verification;
        }
      });

      setVerifications(latestVerifications);
    } catch (error: any) {
      console.error('Error fetching verifications:', error);
    }
  };

  const handleVerify = async (company: Company) => {
    try {
      setVerifying(prev => ({ ...prev, [company.id]: true }));

      const cif = company.cif || company.cui;
      if (!cif) {
        toast({
          title: 'Eroare',
          description: 'CIF/CUI lipsă pentru această companie',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('client-due-diligence', {
        body: {
          companyId: company.id,
          cif: cif,
          companyName: company.company_name
        }
      });

      if (error) throw error;

      toast({
        title: 'Verificare completă',
        description: `Scor risc: ${data.riskScore}/100 (${getRiskLabel(data.riskLevel)})`,
      });

      await fetchVerifications();
      if (onRefresh) onRefresh();

    } catch (error: any) {
      console.error('Error verifying client:', error);
      toast({
        title: 'Eroare la verificare',
        description: error.message || 'Nu s-a putut verifica clientul',
        variant: 'destructive',
      });
    } finally {
      setVerifying(prev => ({ ...prev, [company.id]: false }));
    }
  };

  const handleVerifyAll = async () => {
    toast({
      title: 'Verificare în curs',
      description: `Se verifică ${clients.length} clienți...`,
    });

    for (const client of clients) {
      await handleVerify(client);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    toast({
      title: 'Verificare completă',
      description: 'Toți clienții au fost verificați',
    });
  };

  const getRiskIcon = (level?: string) => {
    switch (level) {
      case 'low': return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'medium': return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskLabel = (level?: string) => {
    switch (level) {
      case 'low': return 'Risc Scăzut';
      case 'medium': return 'Risc Mediu';
      case 'high': return 'Risc Mare';
      case 'critical': return 'Risc Critic';
      default: return 'Neverificat';
    }
  };

  const getRiskBadgeVariant = (level?: string) => {
    switch (level) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Due Diligence - Verificare Automată Clienți
              </CardTitle>
              <CardDescription>
                Protejează-te de clienți toxici prin verificare automată ANAF, dosare judiciare și reputație
              </CardDescription>
            </div>
            <Button
              onClick={handleVerifyAll}
              variant="outline"
              disabled={clients.length === 0}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Verifică Toți Clienții ({clients.length})
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nu există clienți de verificat
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firmă</TableHead>
                  <TableHead>CIF/CUI</TableHead>
                  <TableHead>Status Verificare</TableHead>
                  <TableHead>Ultima Verificare</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const verification = verifications[client.id];
                  const isVerifying = verifying[client.id];

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.company_name}
                      </TableCell>
                      <TableCell>
                        {client.cif || client.cui || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(verification?.risk_level)}>
                          <span className="flex items-center gap-1">
                            {getRiskIcon(verification?.risk_level)}
                            {verification ? (
                              <>
                                {getRiskLabel(verification.risk_level)} ({verification.risk_score}/100)
                              </>
                            ) : (
                              'Neverificat'
                            )}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {verification ? formatDate(verification.created_at) : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {verification && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVerification(verification);
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalii
                          </Button>
                        )}
                        <Button
                          variant={verification ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleVerify(client)}
                          disabled={isVerifying}
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Verificare...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-4 w-4 mr-1" />
                              {verification ? 'Re-verifică' : 'Verifică'}
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientVerificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        verification={selectedVerification}
      />
    </>
  );
};
