import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Activity, AlertTriangle, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { ResilienceScore } from './types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AcademicFrameworkSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 transition-colors text-left">
        <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary flex-1">Cadru Academic</span>
        {isOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 text-xs text-muted-foreground">
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <p className="font-semibold text-foreground">Modelul 4R (Bruneau et al., 2003)</p>
          <p><strong>Robustețe</strong> – capacitatea de a rezista la șocuri fără degradare semnificativă</p>
          <p><strong>Redundanță</strong> – existența resurselor de rezervă și a alternativelor funcționale</p>
          <p><strong>Ingeniozitate</strong> – abilitatea de a mobiliza resurse și a improviza soluții</p>
          <p><strong>Rapiditate</strong> – viteza de recuperare și restaurare a funcționalității</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <p className="font-semibold text-foreground">Modelul Capabilităților (Duchek, 2020)</p>
          <p>Reziliența organizațională ca proces în 3 faze: <em>Anticipare → Coping → Adaptare</em>, fiecare cu capabilități specifice măsurabile.</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <p className="font-semibold text-foreground">Conexiunea Antreprenor–Firmă (Shepherd et al., 2015)</p>
          <p>Reziliența personală a antreprenorului influențează direct reziliența organizațională – dimensiunea emoțională contează la fel de mult ca cea financiară.</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

interface ResilienceScoreCardProps {
  resilienceScore: ResilienceScore;
}

export const ResilienceScoreCard = ({ resilienceScore }: ResilienceScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <Shield className="h-5 w-5 text-green-600" />;
    if (score >= 50) return <Activity className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "Reziliență Ridicată";
    if (score >= 50) return "Reziliență Medie";
    return "Reziliență Scăzută";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap break-words">
          {getScoreIcon(resilienceScore.overall)}
          <span className="break-words">Scor Global Reziliență</span>
        </CardTitle>
        <CardDescription className="break-words">
          Metodologie academică bazată pe 7 dimensiuni validate științific
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-4xl font-bold ${getScoreColor(resilienceScore.overall)}`}>
              {resilienceScore.overall}/100
            </span>
            <Badge variant={resilienceScore.overall >= 75 ? "default" : resilienceScore.overall >= 50 ? "secondary" : "destructive"}>
              {getScoreLabel(resilienceScore.overall)}
            </Badge>
          </div>
          <Progress value={resilienceScore.overall} className="h-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium break-words">Anticipare (15%)</span>
              <span className={`text-sm ${getScoreColor(resilienceScore.anticipation)}`}>
                {resilienceScore.anticipation}
              </span>
            </div>
            <Progress value={resilienceScore.anticipation} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium break-words">Coping (25%)</span>
              <span className={`text-sm ${getScoreColor(resilienceScore.coping)}`}>
                {resilienceScore.coping}
              </span>
            </div>
            <Progress value={resilienceScore.coping} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium break-words">Adaptare (20%)</span>
              <span className={`text-sm ${getScoreColor(resilienceScore.adaptation)}`}>
                {resilienceScore.adaptation}
              </span>
            </div>
            <Progress value={resilienceScore.adaptation} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium break-words">Robustețe (20%)</span>
              <span className={`text-sm ${getScoreColor(resilienceScore.robustness)}`}>
                {resilienceScore.robustness}
              </span>
            </div>
            <Progress value={resilienceScore.robustness} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium break-words">Redundanță (10%)</span>
              <span className={`text-sm ${getScoreColor(resilienceScore.redundancy)}`}>
                {resilienceScore.redundancy}
              </span>
            </div>
            <Progress value={resilienceScore.redundancy} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium break-words">Resurse (5%)</span>
              <span className={`text-sm ${getScoreColor(resilienceScore.resourcefulness)}`}>
                {resilienceScore.resourcefulness}
              </span>
            </div>
            <Progress value={resilienceScore.resourcefulness} className="h-2" />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground break-words overflow-wrap-anywhere">
            Scorurile sunt calculate pe baza metodologiilor academice validate (Duchek, 2020; Linnenluecke, 2017)
          </p>
        </div>

        <AcademicFrameworkSection />
      </CardContent>
    </Card>
  );
};
