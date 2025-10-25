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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Loader2, Plus, Trash2, Save, UserPlus, Info } from "lucide-react";

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
  
  // Quick add member form state
  const [showQuickAddForm, setShowQuickAddForm] = useState(false);
  const [quickMemberName, setQuickMemberName] = useState("");
  const [quickMemberEmail, setQuickMemberEmail] = useState("");
  const [quickMemberRole, setQuickMemberRole] = useState("Contabil");

  // Fetch DOAR membrii asignați acestei companii
  const { data: availableMembers } = useQuery({
    queryKey: ["company-team-members", workflow.company_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_team_assignments")
        .select(`
          team_member_id,
          workflow_team_members(id, member_name, member_email, member_role, is_active)
        `)
        .eq("company_id", workflow.company_id)
        .eq("is_active", true);

      if (error) throw error;

      // Flatten și filtrează doar membrii activi
      return data
        .map((assignment: any) => assignment.workflow_team_members)
        .filter((member: any) => member && member.is_active);
    },
    enabled: !!user && !!workflow.company_id,
  });

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

  // Quick add member mutation
  const addQuickMember = useMutation({
    mutationFn: async () => {
      // Step 1: Create team member
      const { data: newMember, error: memberError } = await supabase
        .from("workflow_team_members")
        .insert({
          accountant_id: user!.id,
          member_name: quickMemberName,
          member_email: quickMemberEmail,
          member_role: quickMemberRole,
          is_active: true,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Step 2: Assign to company
      const { error: assignError } = await supabase
        .from("company_team_assignments")
        .insert({
          accountant_id: user!.id,
          company_id: workflow.company_id,
          team_member_id: newMember.id,
          role_on_company: quickMemberRole,
          is_active: true,
        });

      if (assignError) throw assignError;

      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["company-assignments"] });
      toast({
        title: "✅ Membru adăugat",
        description: `${quickMemberName} a fost adăugat cu succes.`,
      });
      setShowQuickAddForm(false);
      setQuickMemberName("");
      setQuickMemberEmail("");
      setQuickMemberRole("Contabil");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <TooltipProvider>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={addStage} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă Etapă
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adaugă un pas nou în procesul de lucru</p>
                  <p className="text-xs text-muted-foreground">(ex: Verificare finală, Audit)</p>
                </TooltipContent>
              </Tooltip>
            </div>

          {/* Quick Add Member Form */}
          {showQuickAddForm && (
            <Card className="p-4 border-primary/50 bg-primary/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Adaugă rapid un coleg</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickAddForm(false)}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nume</Label>
                    <Input
                      placeholder="Ex: Ion Popescu"
                      value={quickMemberName}
                      onChange={(e) => setQuickMemberName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="ion@example.com"
                      value={quickMemberEmail}
                      onChange={(e) => setQuickMemberEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Rol</Label>
                    <Select value={quickMemberRole} onValueChange={setQuickMemberRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contabil">Contabil</SelectItem>
                        <SelectItem value="Contabil Senior">Contabil Senior</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Asistent">Asistent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={() => addQuickMember.mutate()}
                  disabled={!quickMemberName || !quickMemberEmail || addQuickMember.isPending}
                  size="sm"
                  className="w-full"
                >
                  {addQuickMember.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Adaugă Membru
                </Button>
              </div>
            </Card>
          )}

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
                    <div className="flex items-center gap-2">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Label className="flex items-center gap-1 cursor-help">
                            Asignează membru
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Label>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Ce sunt membrii echipei?</h4>
                            <p className="text-sm text-muted-foreground">
                              Membrii sunt colegii care lucrează la dosarele tale. 
                              Poți asigna fiecare etapă unui membru specific.
                            </p>
                            <p className="text-xs text-muted-foreground border-t pt-2">
                              💡 Sfat: Adaugă mai întâi membrii folosind butonul de mai jos
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    
                     <div className="flex gap-2">
                      <Select
                        value={stage.assigned_member_id || "unassigned"}
                        onValueChange={(value) =>
                          updateStage(index, "assigned_member_id", value === "unassigned" ? null : value)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={(availableMembers?.length || 0) === 0 ? "Nu există membri asignați" : "Neasignat"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Neasignat</SelectItem>
                          {(!availableMembers || availableMembers.length === 0) ? (
                            <SelectItem value="no-members" disabled>
                              ⚠️ Niciun membru asignat companiei. Mergi la tab "Echipa Client".
                            </SelectItem>
                          ) : (
                            availableMembers.map((member: any) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.member_name} - {member.member_role}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQuickAddForm(!showQuickAddForm)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Adaugă membru nou rapid</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
    </TooltipProvider>
  );
};