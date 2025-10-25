import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

interface EditWorkflowDialogProps {
  workflow: any;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "⏳ Nu început" },
  { value: "in_progress", label: "🔄 În lucru" },
  { value: "completed", label: "✅ Finalizat" },
  { value: "blocked", label: "🚫 Blocat" },
];

export const EditWorkflowDialog = ({ workflow, onClose }: EditWorkflowDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [stages, setStages] = useState<any[]>(workflow.stages || []);

  // Fetch team members pentru asignare
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

  // Fetch company assignments
  const { data: companyAssignments } = useQuery({
    queryKey: ["company-assignments", workflow.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_team_assignments")
        .select(`
          *,
          workflow_team_members(id, member_name, member_email, member_role)
        `)
        .eq("company_id", workflow.company_id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!workflow.company_id,
  });

  const availableMembers = companyAssignments?.map((a: any) => a.workflow_team_members) || teamMembers || [];

  const updateWorkflow = useMutation({
    mutationFn: async () => {
      const completedCount = stages.filter((s: any) => s.status === "completed").length;
      const progressPercent = Math.round((completedCount / stages.length) * 100);
      const overallStatus = completedCount === stages.length ? "completed" : 
                           stages.some((s: any) => s.status === "in_progress") ? "in_progress" : "not_started";

      const { error } = await supabase
        .from("monthly_company_workflows")
        .update({
          stages,
          progress_percent: progressPercent,
          overall_status: overallStatus,
        })
        .eq("id", workflow.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-workflows"] });
      toast({
        title: "✅ Workflow actualizat",
        description: "Modificările au fost salvate cu succes.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addStage = () => {
    setStages([
      ...stages,
      {
        stage_number: stages.length + 1,
        stage_name: "Etapă nouă",
        estimated_days: 2,
        status: "not_started",
        assigned_member_id: null,
        started_at: null,
        completed_at: null,
      },
    ]);
  };

  const removeStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    // Renumerotează etapele
    newStages.forEach((stage, i) => {
      stage.stage_number = i + 1;
    });
    setStages(newStages);
  };

  const updateStage = (index: number, field: string, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editează Workflow - {workflow.companies?.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Personalizează etapele, termenele și echipa pentru acest client
            </p>
            <Button onClick={addStage} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Etapă
            </Button>
          </div>

          {stages.map((stage, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Etapa {stage.stage_number}</h4>
                  {stages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStage(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nume etapă</Label>
                    <Input
                      value={stage.stage_name}
                      onChange={(e) => updateStage(index, "stage_name", e.target.value)}
                      placeholder="Ex: Primire documente"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Zile estimate</Label>
                    <Input
                      type="number"
                      min="1"
                      value={stage.estimated_days}
                      onChange={(e) => updateStage(index, "estimated_days", parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={stage.status}
                      onValueChange={(value) => updateStage(index, "status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Asignează membru</Label>
                    <Select
                      value={stage.assigned_member_id || "unassigned"}
                      onValueChange={(value) =>
                        updateStage(index, "assigned_member_id", value === "unassigned" ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Neasignat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Neasignat</SelectItem>
                        {availableMembers.map((member: any) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.member_name} - {member.member_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {stage.started_at && (
                  <div className="text-sm text-muted-foreground">
                    Început: {new Date(stage.started_at).toLocaleDateString("ro-RO")}
                    {stage.completed_at && ` • Finalizat: ${new Date(stage.completed_at).toLocaleDateString("ro-RO")}`}
                  </div>
                )}
              </div>
            </Card>
          ))}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => updateWorkflow.mutate()}
              disabled={updateWorkflow.isPending}
              className="flex-1"
            >
              {updateWorkflow.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvează Modificările
            </Button>
            <Button onClick={onClose} variant="outline">
              Anulează
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};