import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, BarChart3, Download, Share2, TrendingUp, Zap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

interface QuickStartGuideProps {
  onOpenChat: () => void;
  onOpenDashboard: () => void;
  userSubscriptionType?: string;
  isAccountant?: boolean;
}

export const QuickStartGuide = ({ onOpenChat, onOpenDashboard, userSubscriptionType, isAccountant }: QuickStartGuideProps) => {
  const navigate = useNavigate();
  const { themeType } = useTheme();
  
  // Verificăm dacă utilizatorul este contabil SAU dacă adminul este în modul contabil
  const isAccountantUser = userSubscriptionType === 'accounting_firm' || isAccountant || themeType === 'accountant';

  // Primul card diferă în funcție de tipul de utilizator
  const firstFeature = isAccountantUser ? {
    icon: Building2,
    title: 'YanaCRM',
    description: 'Gestionează clienții și serviciile contabile',
    action: 'Deschide CRM',
    onClick: () => navigate('/yanacrm'),
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
  } : {
    icon: MessageCircle,
    title: 'Chat AI',
    description: 'Încarcă balanța în chatbot pentru analiză instant',
    action: 'Deschide Chat',
    onClick: onOpenChat,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  };

  const features = [
    firstFeature,
    {
      icon: BarChart3,
      title: 'Dashboard',
      description: 'Vizualizează grafice și indicatori financiari',
      action: 'Vezi Dashboard',
      onClick: onOpenDashboard,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: TrendingUp,
      title: 'Comparare',
      description: 'Compară multiple analize pentru tendințe',
      action: 'Explorează',
      onClick: onOpenDashboard,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Download,
      title: 'Export PDF',
      description: 'Descarcă rapoarte profesionale instant',
      action: 'Generează',
      onClick: onOpenDashboard,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
    {
      icon: Share2,
      title: 'Partajare',
      description: 'Trimite analize prin email către echipă',
      action: 'Trimite',
      onClick: onOpenDashboard,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: Zap,
      title: 'Analiză Rapidă',
      description: 'Rezultate în 3-5 secunde cu AI',
      action: 'Încearcă',
      onClick: onOpenChat,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <Card className="shadow-lg border-primary/20 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Funcții Principale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-all animate-fade-in hover-scale"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col gap-3 h-full">
                <div className={`p-3 rounded-lg ${feature.bgColor} w-fit`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 flex-1">
                    {feature.description}
                  </p>
                  <Button
                    onClick={feature.onClick}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs hover-scale mt-auto"
                  >
                    {feature.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAccountantUser ? (
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">
                  💼 Începe cu YanaCRM
                </p>
                <p className="text-xs text-muted-foreground">
                  Deschide CRM-ul pentru a gestiona clienții și serviciile contabile. Poți invita clienți, seta servicii și centraliza documente.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">
                  💡 Începe cu Chat AI
                </p>
                <p className="text-xs text-muted-foreground">
                  Apasă pe iconița de chat din colțul din dreapta jos și încarcă balanța ta Excel. 
                  Vei primi o analiză completă în câteva secunde!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
