import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { TrendingDown, Users, LogIn, MessageSquare, CreditCard, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface FunnelStep {
  name: string;
  value: number;
  fill: string;
  conversion?: number;
}

interface FunnelData {
  landingViews: number;
  ctaClicks: number;
  authViews: number;
  signups: number;
  logins: number;
  yanaViews: number;
  conversations: number;
  checkouts: number;
}

const FUNNEL_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];

export function FunnelAnalytics() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    loadFunnelData();
  }, [dateRange]);

  const loadFunnelData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate: Date | null = null;
      
      if (dateRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Query pentru fiecare event
      const eventCounts = await Promise.all([
        // Landing page views
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'page_view')
          .ilike('page_url', '%lovable.app%')
          .not('page_url', 'ilike', '%/yana%')
          .not('page_url', 'ilike', '%/auth%')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // CTA clicks
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'landing_cta_click')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // Auth page views
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'auth_page_view')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // Signups
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'auth_signup_success')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // Logins
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'auth_login_success')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // Yana page views
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'yana_page_view')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // Conversations started
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'yana_conversation_started')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
        
        // Checkouts
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_name', 'checkout_started')
          .gte('created_at', startDate?.toISOString() || '2020-01-01'),
      ]);

      setFunnelData({
        landingViews: eventCounts[0].count || 0,
        ctaClicks: eventCounts[1].count || 0,
        authViews: eventCounts[2].count || 0,
        signups: eventCounts[3].count || 0,
        logins: eventCounts[4].count || 0,
        yanaViews: eventCounts[5].count || 0,
        conversations: eventCounts[6].count || 0,
        checkouts: eventCounts[7].count || 0,
      });
    } catch (error) {
      console.error('Error loading funnel data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Funnel Conversie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-[90%]" />
            <Skeleton className="h-8 w-[75%]" />
            <Skeleton className="h-8 w-[50%]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!funnelData) return null;

  // Pregătire date pentru funnel vizualizare
  const funnelSteps: FunnelStep[] = [
    { name: 'Landing Views', value: funnelData.landingViews, fill: FUNNEL_COLORS[0] },
    { name: 'CTA Clicks', value: funnelData.ctaClicks, fill: FUNNEL_COLORS[1] },
    { name: 'Auth Page', value: funnelData.authViews, fill: FUNNEL_COLORS[2] },
    { name: 'Signup/Login', value: funnelData.signups + funnelData.logins, fill: FUNNEL_COLORS[3] },
    { name: 'Yana Access', value: funnelData.yanaViews, fill: FUNNEL_COLORS[4] },
    { name: 'Conversații', value: funnelData.conversations, fill: FUNNEL_COLORS[5] },
    { name: 'Checkout', value: funnelData.checkouts, fill: FUNNEL_COLORS[6] },
  ].map((step, idx, arr) => ({
    ...step,
    conversion: idx === 0 ? 100 : arr[0].value > 0 ? Math.round((step.value / arr[0].value) * 100) : 0
  }));

  // Calculează drop-off-uri
  const dropOffs = funnelSteps.slice(1).map((step, idx) => {
    const prevValue = funnelSteps[idx].value;
    const dropOff = prevValue > 0 ? Math.round(((prevValue - step.value) / prevValue) * 100) : 0;
    return {
      from: funnelSteps[idx].name,
      to: step.name,
      dropOff,
      lost: prevValue - step.value
    };
  });

  const worstDropOff = dropOffs.reduce((worst, current) => 
    current.dropOff > worst.dropOff ? current : worst
  , dropOffs[0]);

  return (
    <div className="space-y-6">
      {/* Header cu date range */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Funnel Conversie: Landing → Yana → Plată
            </CardTitle>
            <div className="flex gap-2">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <Badge
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setDateRange(range)}
                >
                  {range === '7d' ? '7 zile' : range === '30d' ? '30 zile' : 'Tot'}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPI Cards pentru funnel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{funnelData.landingViews}</div>
              <p className="text-xs text-muted-foreground">Vizitatori Landing</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <LogIn className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{funnelData.signups + funnelData.logins}</div>
              <p className="text-xs text-muted-foreground">Autentificări</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <MessageSquare className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{funnelData.conversations}</div>
              <p className="text-xs text-muted-foreground">Conversații Yana</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <CreditCard className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{funnelData.checkouts}</div>
              <p className="text-xs text-muted-foreground">Checkout-uri</p>
            </div>
          </div>

          {/* Vizualizare Funnel orizontal */}
          <div className="space-y-3">
            {funnelSteps.map((step, idx) => (
              <div key={step.name} className="flex items-center gap-3">
                <div className="w-28 text-sm text-right text-muted-foreground">
                  {step.name}
                </div>
                <div className="flex-1 relative">
                  <div 
                    className="h-8 rounded-md transition-all duration-500"
                    style={{ 
                      width: `${step.conversion}%`,
                      backgroundColor: step.fill,
                      minWidth: step.value > 0 ? '40px' : '0'
                    }}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium text-white">
                    {step.value > 0 && step.value}
                  </span>
                </div>
                <div className="w-16 text-sm font-medium">
                  {step.conversion}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerte pentru drop-off-uri mari */}
      {worstDropOff && worstDropOff.dropOff > 50 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-orange-500/20">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold text-orange-600 dark:text-orange-400">
                  Drop-off major detectat
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Pierzi <strong>{worstDropOff.dropOff}%</strong> din utilizatori între{' '}
                  <strong>{worstDropOff.from}</strong> și <strong>{worstDropOff.to}</strong>{' '}
                  ({worstDropOff.lost} utilizatori pierduți).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalii drop-off */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalii Drop-off între Pași</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dropOffs.map((drop, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span>{drop.from}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span>{drop.to}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    -{drop.lost} utilizatori
                  </span>
                  <Badge 
                    variant={drop.dropOff > 70 ? 'destructive' : drop.dropOff > 40 ? 'secondary' : 'outline'}
                  >
                    -{drop.dropOff}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
