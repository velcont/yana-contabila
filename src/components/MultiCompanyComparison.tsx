import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

export const MultiCompanyComparison = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any[]>([]);
  const [aggregateStats, setAggregateStats] = useState<any>(null);

  useEffect(() => {
    fetchCompanyAnalytics();
  }, []);

  const fetchCompanyAnalytics = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Auto-link analize orfane ÎNAINTE de query principal
      try {
        const { data: linkResults } = await supabase.rpc(
          'link_orphan_analyses_to_companies',
          { p_user_id: user.id }
        );
        
        if (linkResults && linkResults.length > 0) {
          console.log(`✅ Auto-linked ${linkResults.length} orphan analyses to companies`);
        }
      } catch (linkError) {
        console.warn('Auto-linking skipped:', linkError);
      }

      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('managed_by_accountant_id', user.id);

      if (companiesError) throw companiesError;

      if (!companies || companies.length === 0) {
        setCompanyData([]);
        setLoading(false);
        return;
      }

      const analyticsPromises = companies.map(async (company) => {
        const { data: analyses } = await supabase
          .from('analyses')
          .select('metadata, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (analyses && analyses.metadata) {
          const meta = analyses.metadata as any;
          return {
            name: company.company_name,
            profit: meta.profit || 0,
            ca: meta.ca || 0,
            dso: meta.dso || 0,
            ebitda: meta.ebitda || 0,
            lastUpdate: analyses.created_at
          };
        }
        return null;
      });

      const results = await Promise.all(analyticsPromises);
      const validData = results.filter(Boolean);
      
      setCompanyData(validData);

      if (validData.length > 0) {
        const avgProfit = validData.reduce((sum, c) => sum + c.profit, 0) / validData.length;
        const avgCA = validData.reduce((sum, c) => sum + c.ca, 0) / validData.length;
        const avgDSO = validData.reduce((sum, c) => sum + c.dso, 0) / validData.length;
        const totalClients = validData.length;
        const profitableClients = validData.filter(c => c.profit > 0).length;
        const clientsWithHighDSO = validData.filter(c => c.dso > 60).length;

        setAggregateStats({
          avgProfit,
          avgCA,
          avgDSO,
          totalClients,
          profitableClients,
          clientsWithHighDSO,
          profitabilityRate: (profitableClients / totalClients) * 100
        });
      }
    } catch (error: any) {
      console.error('Error fetching company analytics:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele comparative',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Se încarcă datele comparative...</p>
        </CardContent>
      </Card>
    );
  }

  if (!companyData.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="flex flex-col items-center gap-3">
            <TrendingUp className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                Încă nu ai analize pentru clienții tăi
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Pentru a vedea comparații și statistici, analizează balantele clienților tăi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {aggregateStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Clienți</CardDescription>
              <CardTitle className="text-3xl">{aggregateStats.totalClients}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">
                  {aggregateStats.profitableClients} profitabili
                </span>
                <span className="text-muted-foreground">
                  ({aggregateStats.profitabilityRate.toFixed(0)}%)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Profit Mediu</CardDescription>
              <CardTitle className="text-3xl">
                {aggregateStats.avgProfit.toLocaleString('ro-RO', { 
                  maximumFractionDigits: 0 
                })} RON
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                CA Mediu: {aggregateStats.avgCA.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>DSO Mediu</CardDescription>
              <CardTitle className="text-3xl">{aggregateStats.avgDSO.toFixed(0)} zile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                {aggregateStats.clientsWithHighDSO > 0 && (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-orange-500 font-medium">
                      {aggregateStats.clientsWithHighDSO} clienți cu DSO ridicat
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Comparație Profit pe Client</CardTitle>
          <CardDescription>Profitabilitatea fiecărui client</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={companyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => value.toLocaleString('ro-RO') + ' RON'}
              />
              <Legend />
              <Bar dataKey="profit" fill="#10b981" name="Profit (RON)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparație DSO (Zile de Încasare)</CardTitle>
          <CardDescription>Viteza de încasare pentru fiecare client</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={companyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toFixed(0) + ' zile'} />
              <Legend />
              <Bar dataKey="dso" fill="#3b82f6" name="DSO (zile)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiCompanyComparison;
