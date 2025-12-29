import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Eye, Lightbulb, Target, HelpCircle, BarChart3 } from "lucide-react";
import { logger } from "@/lib/logger";

interface ReasoningStep {
  id: string;
  step_type: string;
  step_content: string;
  methodology_used: string | null;
  created_at: string;
}

interface ReasoningStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function ReasoningStepsDialog({ 
  open, 
  onOpenChange, 
  conversationId 
}: ReasoningStepsDialogProps) {
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && conversationId) {
      loadSteps();
    }
  }, [open, conversationId]);

  const loadSteps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategic_reasoning_steps')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSteps(data || []);
    } catch (error) {
      logger.error('❌ [REASONING-DIALOG] Error loading steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'observation':
        return <Eye className="w-4 h-4" />;
      case 'methodology':
        return <BarChart3 className="w-4 h-4" />;
      case 'reasoning':
        return <Lightbulb className="w-4 h-4" />;
      case 'recommendation':
        return <Target className="w-4 h-4" />;
      case 'continuation':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getStepLabel = (type: string) => {
    switch (type) {
      case 'observation': return 'Observație';
      case 'methodology': return 'Metodologie';
      case 'reasoning': return 'Raționament';
      case 'recommendation': return 'Recomandare';
      case 'continuation': return 'Continuare';
      default: return type;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'observation': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'methodology': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'reasoning': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'recommendation': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'continuation': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Group steps by timestamp (approximately same response)
  const groupedSteps = steps.reduce((acc, step) => {
    const date = new Date(step.created_at).toLocaleString('ro-RO');
    if (!acc[date]) acc[date] = [];
    acc[date].push(step);
    return acc;
  }, {} as Record<string, ReasoningStep[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Raționamentul Yana
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Niciun raționament înregistrat încă.</p>
              <p className="text-sm mt-1">
                Pașii de gândire vor apărea după ce Yana oferă analize strategice.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSteps).map(([timestamp, groupSteps]) => (
                <div key={timestamp} className="space-y-3">
                  <p className="text-xs text-muted-foreground border-b pb-2">
                    {timestamp}
                  </p>
                  <div className="space-y-3 pl-2">
                    {groupSteps.map((step) => (
                      <div key={step.id} className="flex gap-3">
                        <div className={`flex-shrink-0 p-2 rounded-lg ${getStepColor(step.step_type)}`}>
                          {getStepIcon(step.step_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {getStepLabel(step.step_type)}
                            </Badge>
                            {step.methodology_used && (
                              <Badge variant="secondary" className="text-xs">
                                {step.methodology_used}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                            {step.step_content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
