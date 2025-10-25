import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, CheckCircle, Pause, Loader2 } from "lucide-react";

interface MonthlyWorkflowStageDialogProps {
  stage: any;
  workflow: any;
  onClose: () => void;
  onUpdate: () => void;
}

export const MonthlyWorkflowStageDialog = ({ stage, workflow, onClose, onUpdate }: MonthlyWorkflowStageDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [notes, setNotes] = useState(stage.notes || "");
  const [responsiblePersonId, setResponsiblePersonId] = useState(stage.responsible_person_id || "");

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_team_members")
        .select("*")
        .eq("accountant_id", user!.id)
        .eq("is_active", true)
        .order("member_name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation pentru start stage
  const startStage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("monthly_workflow_stages")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
          responsible_person_id: responsiblePersonId || null,
          notes,
        })
        .eq("id", stage.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "✅ Etapă începută",
        description: `Etapa "${stage.stage_name}" a fost marcată ca în lucru.`,
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pentru complete stage
  const completeStage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("monthly_workflow_stages")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq("id", stage.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "✅ Etapă finalizată",
        description: `Etapa "${stage.stage_name}" a fost finalizată cu succes.`,
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pentru pause stage
  const pauseStage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("monthly_workflow_stages")
        .update({
          status: "not_started",
          started_at: null,
          notes,
        })
        .eq("id", stage.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "⏸️ Etapă pusă pe pauză",
        description: `Etapa "${stage.stage_name}" a fost resetată.`,
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = () => {
    if (stage.status === "completed") {
      return <Badge className="bg-green-500">✅ Finalizat</Badge>;
    }
    if (stage.status === "in_progress") {
      return <Badge variant="default">🔄 În lucru</Badge>;
    }
    return <Badge variant="secondary">⏳ Nu început</Badge>;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      receptionist: "Recepționist",
      junior_accountant: "Contabil Junior",
      hr_accountant: "Contabil HR",
      senior_accountant: "Contabil Senior",
      declarations_accountant: "Contabil Declarații",
    };
    return labels[role] || role;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {stage.stage_name}
          </DialogTitle>
          <DialogDescription>
            {workflow.companies.company_name} - {new Date(workflow.month_year + "-01").toLocaleDateString("ro-RO", { year: "numeric", month: "long" }).charAt(0).toUpperCase() + new Date(workflow.month_year + "-01").toLocaleDateString("ro-RO", { year: "numeric", month: "long" }).slice(1)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status curent:</span>
            {getStatusBadge()}
          </div>

          {/* Persoană responsabilă */}
          <div className="space-y-2">
            <Label htmlFor="responsible">Persoană responsabilă</Label>
            <Select
              value={responsiblePersonId}
              onValueChange={setResponsiblePersonId}
              disabled={stage.status === "completed"}
            >
              <SelectTrigger id="responsible">
                <SelectValue placeholder="Selectează persoană responsabilă" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.member_name} ({getRoleLabel(member.member_role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notițe */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observații</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adaugă observații despre această etapă..."
              className="min-h-[100px]"
              disabled={stage.status === "completed"}
            />
          </div>

          {/* Timeline */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creat:</span>
                <span>{new Date(stage.created_at).toLocaleString("ro-RO")}</span>
              </div>
              {stage.started_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Început:</span>
                  <span>{new Date(stage.started_at).toLocaleString("ro-RO")}</span>
                </div>
              )}
              {stage.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finalizat:</span>
                  <span>{new Date(stage.completed_at).toLocaleString("ro-RO")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zile estimate:</span>
                <span>{stage.estimated_days} {stage.estimated_days === 1 ? "zi" : "zile"}</span>
              </div>
            </div>
          </div>

          {/* Acțiuni */}
          <div className="flex gap-3 border-t pt-4">
            {stage.status === "not_started" && (
              <Button
                onClick={() => startStage.mutate()}
                disabled={startStage.isPending || !responsiblePersonId}
                className="flex-1"
              >
                {startStage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Începe Etapa
              </Button>
            )}

            {stage.status === "in_progress" && (
              <>
                <Button
                  onClick={() => completeStage.mutate()}
                  disabled={completeStage.isPending}
                  className="flex-1"
                >
                  {completeStage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Finalizează Etapa
                </Button>
                <Button
                  onClick={() => pauseStage.mutate()}
                  disabled={pauseStage.isPending}
                  variant="outline"
                >
                  {pauseStage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Pause className="h-4 w-4 mr-2" />
                  )}
                  Pune pe Pauză
                </Button>
              </>
            )}

            <Button onClick={onClose} variant="outline">
              Închide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
