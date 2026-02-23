import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ArrowRight, Download, Brain, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BusinessProfileForm } from '@/components/ai-strategy/BusinessProfileForm';
import { OpportunitiesDisplay } from '@/components/ai-strategy/OpportunitiesDisplay';
import { CostBreakdown } from '@/components/ai-strategy/CostBreakdown';
import { ROIProjections } from '@/components/ai-strategy/ROIProjections';
import { ImplementationRoadmap } from '@/components/ai-strategy/ImplementationRoadmap';
import { AssumptionsEditor } from '@/components/ai-strategy/AssumptionsEditor';
import { generateAIStrategyPDF } from '@/utils/generateAIStrategyPDF';
import {
  DEFAULT_ASSUMPTIONS,
  INDUSTRY_GROWTH_BENCHMARKS,
  INDUSTRY_COST_REDUCTION,
  INDUSTRY_AVG_SALARY,
  type BusinessProfile,
  type AIAnalysis,
  type Assumptions,
} from '@/config/aiStrategyData';
import { Link } from 'react-router-dom';
import { YanaHomeButton } from '@/components/YanaHomeButton';

const STEPS = [
  'Profil Afacere',
  'Oportunități AI',
  'Costuri',
  'ROI',
  'Plan Implementare',
  'Ajustări & Export',
];

interface SavedReport {
  id: string;
  industry: string;
  employees_count: number;
  annual_revenue: number;
  created_at: string;
  ai_analysis: AIAnalysis;
  assumptions: any;
  net_profit: number;
  departments: string[];
  business_description: string;
}

export default function AIStrategy() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load saved reports
  useEffect(() => {
    if (!user) return;
    supabase
      .from('ai_strategy_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setSavedReports(data as unknown as SavedReport[]);
      });
  }, [user]);

  const loadReport = (report: SavedReport) => {
    setProfile({
      industry: report.industry,
      employeesCount: report.employees_count,
      annualRevenue: Number(report.annual_revenue),
      netProfit: Number(report.net_profit),
      departments: report.departments || [],
      businessDescription: report.business_description || '',
    });
    setAnalysis(report.ai_analysis);
    if (report.assumptions) {
      setAssumptions({
        usdRonRate: report.assumptions.usd_ron_rate || 4.97,
        hourlyCost: report.assumptions.hourly_cost || 50,
        growthPercent: report.assumptions.growth_percent || 10,
        costReductionPercent: report.assumptions.cost_reduction_percent || 12,
        usersPerTool: report.assumptions.users_per_tool || 1,
      });
    }
    setStep(1);
    setShowHistory(false);
    toast.success('Raport încărcat');
  };

  const deleteReport = async (id: string) => {
    await supabase.from('ai_strategy_reports').delete().eq('id', id);
    setSavedReports(prev => prev.filter(r => r.id !== id));
    toast.success('Raport șters');
  };

  const handleProfileSubmit = async (p: BusinessProfile) => {
    setProfile(p);
    setIsLoading(true);

    // Set industry-specific defaults
    setAssumptions(prev => ({
      ...prev,
      growthPercent: INDUSTRY_GROWTH_BENCHMARKS[p.industry] || 10,
      costReductionPercent: INDUSTRY_COST_REDUCTION[p.industry] || 12,
      hourlyCost: Math.round((INDUSTRY_AVG_SALARY[p.industry] || 5500) / 168),
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-strategy-advisor', {
        body: {
          industry: p.industry,
          employeesCount: p.employeesCount,
          annualRevenue: p.annualRevenue,
          netProfit: p.netProfit,
          departments: p.departments,
          businessDescription: p.businessDescription,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      setAnalysis(data.analysis);
      setStep(1);
      toast.success('Analiza AI finalizată!');
    } catch (err: any) {
      console.error('AI Strategy error:', err);
      toast.error('Eroare la generarea analizei. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!profile || !analysis) return;
    generateAIStrategyPDF(profile, analysis, assumptions);
    toast.success('PDF generat cu succes!');
  };

  const renderStep = () => {
    if (!analysis || !profile) return null;

    switch (step) {
      case 1:
        return <OpportunitiesDisplay opportunities={analysis.opportunities} />;
      case 2:
        return <CostBreakdown costEstimates={analysis.costEstimates} assumptions={assumptions} />;
      case 3:
        return (
          <ROIProjections
            costEstimates={analysis.costEstimates}
            opportunities={analysis.opportunities}
            assumptions={assumptions}
            annualRevenue={profile.annualRevenue}
          />
        );
      case 4:
        return <ImplementationRoadmap roadmap={analysis.roadmap} />;
      case 5:
        return (
          <div className="space-y-6">
            <AssumptionsEditor assumptions={assumptions} onChange={setAssumptions} />
            <Button onClick={handleExportPDF} size="lg" className="w-full gap-2">
              <Download className="h-5 w-5" />
              Generează Raport PDF
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <YanaHomeButton />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Transformare Digitală cu AI
              </h1>
              <p className="text-sm text-muted-foreground">
                Analizează-ți afacerea și descoperă cum AI poate crește profitul
              </p>
            </div>
          </div>
          {savedReports.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1.5"
            >
              <History className="h-4 w-4" />
              Rapoarte ({savedReports.length})
            </Button>
          )}
        </div>

        {/* Saved reports drawer */}
        {showHistory && (
          <Card className="mb-6">
            <CardContent className="pt-4 space-y-2">
              <h3 className="font-medium text-sm mb-2">Rapoartele tale anterioare</h3>
              {savedReports.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-accent/50 cursor-pointer"
                  onClick={() => loadReport(r)}
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{r.industry}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('ro-RO')} · {r.employees_count} ang · {Number(r.annual_revenue).toLocaleString('ro-RO')} RON
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={e => { e.stopPropagation(); deleteReport(r.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Progress indicator */}
        {step > 0 && (
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center">
                <Badge
                  variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}
                  className={`cursor-pointer text-xs whitespace-nowrap ${i <= step && analysis ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                  onClick={() => i <= step && analysis && setStep(i === 0 ? 0 : i)}
                >
                  {s}
                </Badge>
                {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {step === 0 ? (
          <BusinessProfileForm onSubmit={handleProfileSubmit} isLoading={isLoading} />
        ) : (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">YANA analizează afacerea ta...</p>
              </div>
            ) : (
              renderStep()
            )}

            {/* Navigation */}
            {!isLoading && analysis && (
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step <= 0}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Înapoi
                </Button>
                {step < 5 && (
                  <Button
                    onClick={() => setStep(s => s + 1)}
                    className="gap-1"
                  >
                    Următorul <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
