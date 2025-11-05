import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, RefreshCw } from 'lucide-react';
import { YanaCFODashboard } from '@/components/YanaCFODashboard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LoadingOverlay } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function CFO() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Array<{id: string, company_name: string}>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    searchParams.get('companyId')
  );
  const [creditRemaining, setCreditRemaining] = useState<number>(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Check access and load companies
  useEffect(() => {
    const checkAccessAndLoadCompanies = async () => {
      if (!user) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_type')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Only entrepreneur accounts have access
        if (profile?.subscription_type !== 'entrepreneur') {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        // Get credit
        const { data: usageData, error: usageError } = await supabase.rpc('get_monthly_ai_usage');
        if (!usageError && usageData?.[0]) {
          const usage = usageData[0];
          const remainingCents = Math.max(0, (usage.budget_cents || 0) - (usage.total_cost_cents || 0));
          const creditLeft = Number((remainingCents / 100).toFixed(2));
          setCreditRemaining(creditLeft);
          
          if (creditLeft > 0) {
            setHasAccess(true);
          }
        }

        // Load companies
        const { data: analyses, error: analysesError } = await supabase
          .from('analyses')
          .select('id, company_id, file_name, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (analysesError) throw analysesError;

        const companyMap = new Map<string, { id: string; company_name: string }>();

        for (const analysis of analyses || []) {
          let companyId = analysis.company_id;
          let companyName = '';

          if (companyId) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('company_name')
              .eq('id', companyId)
              .maybeSingle();

            companyName = companyData?.company_name || `Companie ${companyId.slice(0, 8)}`;
          } else {
            const metadataObj = analysis.metadata as Record<string, any> | null;
            companyName = metadataObj?.company_name || 
                         analysis.file_name?.replace(/\d{8}\.xls.*$/i, '').trim() || 
                         'Companie Necunoscută';
            companyId = `analysis_${analysis.id}`;
          }

          if (!companyMap.has(companyId)) {
            companyMap.set(companyId, { id: companyId, company_name: companyName });
          }
        }

        const companiesList = Array.from(companyMap.values());
        setCompanies(companiesList);

        // Auto-select first company if none selected
        if (!selectedCompanyId && companiesList.length > 0) {
          setSelectedCompanyId(companiesList[0].id);
        }
      } catch (error) {
        console.error('Error loading CFO page:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccessAndLoadCompanies();
  }, [user]);

  const deductCredit = async (amount: number): Promise<boolean> => {
    if (creditRemaining < amount) {
      toast({
        title: "Credit insuficient",
        description: `Necesari ${amount.toFixed(2)} lei.`,
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error: trackError } = await supabase.functions.invoke('track-ai-usage', {
        body: {
          endpoint: 'cfo-dashboard',
          model: 'google/gemini-2.5-flash',
          inputTokens: Math.floor(amount * 2000),
          outputTokens: Math.floor(amount * 2000),
          success: true
        }
      });

      if (trackError) console.error('Error tracking usage:', trackError);

      const { data: usageData, error: usageError } = await supabase.rpc('get_monthly_ai_usage');
      if (!usageError && usageData?.[0]) {
        const usage = usageData[0];
        const remainingCents = Math.max(0, (usage.budget_cents || 0) - (usage.total_cost_cents || 0));
        const newCredit = Number((remainingCents / 100).toFixed(2));
        setCreditRemaining(newCredit);

        if (newCredit <= 2) {
          toast({
            title: "Credit scăzut",
            description: `Mai ai doar ${newCredit.toFixed(2)} lei.`,
            variant: "destructive"
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error in deductCredit:', error);
      toast({
        title: "Eroare",
        description: "Eroare la deducerea creditelor",
        variant: "destructive"
      });
      return false;
    }
  };

  if (isCheckingAccess || loading) {
    return <LoadingOverlay message="Se încarcă CFO Dashboard..." />;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <EmptyState
          icon={<Building2 className="w-16 h-16" />}
          title="Acces Restricționat"
          description="CFO Dashboard este disponibil doar pentru utilizatori cu Planul Antreprenor și credit disponibil."
          action={{
            label: "Activează Planul Antreprenor",
            onClick: () => navigate('/subscription')
          }}
          secondaryAction={{
            label: "Înapoi",
            onClick: () => navigate('/strategic-advisor')
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
                aria-label="Înapoi la Pagina Principală"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">CFO Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Indicatori financiari în timp real
                </p>
              </div>
            </div>

            {companies.length > 1 && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Selectează firma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg border-2 border-primary bg-primary/10">
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground">
                    Credit Disponibil
                  </p>
                  <p className="text-lg font-bold">
                    {creditRemaining.toFixed(2)} lei
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="container mx-auto px-4 py-8 max-w-none">
        <YanaCFODashboard
          userId={user?.id || ""}
          creditRemaining={creditRemaining}
          onCreditDeduct={deductCredit}
        />
      </div>
    </div>
  );
}
