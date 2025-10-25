import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Edit, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditWorkflowDialog } from "./EditWorkflowDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkflowCalendarViewProps {
  selectedCompanyId?: string;
}

export const WorkflowCalendarView = ({ selectedCompanyId = "all" }: WorkflowCalendarViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  // Fetch workflows pentru luna selectată (doar pentru compania selectată)
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["company-workflows", selectedMonth, selectedCompanyId, user?.id],
    queryFn: async () => {
      if (selectedCompanyId === "all") {
        return []; // Nu afișăm nimic dacă nu e selectată o companie
      }

      const { data, error } = await supabase
        .from("monthly_company_workflows")
        .select(`
          *,
          companies!inner(company_name)
        `)
        .eq("company_id", selectedCompanyId)
        .eq("month_year", selectedMonth)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && selectedCompanyId !== "all",
  });

  // Fetch compania selectată
  const { data: selectedCompany } = useQuery({
    queryKey: ["selected-company", selectedCompanyId],
    queryFn: async () => {
      if (selectedCompanyId === "all") return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("id", selectedCompanyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && selectedCompanyId !== "all",
  });

  // Fetch șablon default
  const { data: defaultTemplate } = useQuery({
    queryKey: ["default-template", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_workflow_templates")
        .select("*")
        .eq("accountant_id", user!.id)
        .eq("is_default", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation pentru create workflow pentru compania selectată
  const createWorkflowForCompany = useMutation({
    mutationFn: async () => {
      if (!selectedCompany || !defaultTemplate) {
        throw new Error("Nu există companie selectată sau șablon default");
      }

      // Creează workflow cu stages din template
      const stages = defaultTemplate.stages as any[];
      const { data: createdWorkflow, error: workflowError } = await supabase
        .from("monthly_company_workflows")
        .insert({
          company_id: selectedCompany.id,
          accountant_id: user!.id,
          template_id: defaultTemplate.id,
          month_year: selectedMonth,
          overall_status: "not_started",
          progress_percent: 0,
          stages: stages.map((stage: any, index: number) => ({
            stage_number: stage.stage_number,
            stage_name: stage.stage_name,
            estimated_days: stage.estimated_days,
            status: "not_started",
            default_responsible_role: stage.default_responsible_role,
            assigned_member_id: null,
            started_at: null,
            completed_at: null,
          })),
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      return createdWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-workflows"] });
      toast({
        title: "✅ Workflow creat cu succes!",
        description: `Workflow-ul lunar pentru ${selectedCompany?.company_name} a fost creat.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare la creare workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (workflow: any) => {
    const stages = workflow.stages as any[] || [];
    const totalStages = stages.length;
    const completedStages = stages.filter((s: any) => s.status === "completed").length;
    
    if (workflow.overall_status === "completed") {
      return <Badge className="bg-green-500">✅ Finalizat</Badge>;
    }
    if (workflow.overall_status === "overdue") {
      return <Badge variant="destructive">🔴 În întârziere (Etapa {completedStages + 1}/{totalStages})</Badge>;
    }
    if (workflow.overall_status === "in_progress") {
      return <Badge variant="default">🔄 În lucru (Etapa {completedStages + 1}/{totalStages})</Badge>;
    }
    return <Badge variant="secondary">⏳ Nu început</Badge>;
  };

  const getStageIcon = (stage: any) => {
    if (stage.status === "completed") return "✅";
    if (stage.status === "in_progress") return "🔄";
    if (stage.status === "blocked") return "🚫";
    return "⏳";
  };

  const updateStageStatus = useMutation({
    mutationFn: async ({ workflowId, stageIndex, newStatus, assignedMemberId }: any) => {
      const { data: workflow } = await supabase
        .from("monthly_company_workflows")
        .select("stages")
        .eq("id", workflowId)
        .single();

      if (!workflow) throw new Error("Workflow not found");

      const updatedStages = [...(workflow.stages as any[])];
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        status: newStatus,
        assigned_member_id: assignedMemberId || updatedStages[stageIndex].assigned_member_id,
        started_at: newStatus === "in_progress" && !updatedStages[stageIndex].started_at ? new Date().toISOString() : updatedStages[stageIndex].started_at,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      };

      // Calculează progres
      const completedCount = updatedStages.filter((s: any) => s.status === "completed").length;
      const progressPercent = Math.round((completedCount / updatedStages.length) * 100);
      const overallStatus = completedCount === updatedStages.length ? "completed" : "in_progress";

      const { error } = await supabase
        .from("monthly_company_workflows")
        .update({ 
          stages: updatedStages,
          progress_percent: progressPercent,
          overall_status: overallStatus,
        })
        .eq("id", workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-workflows"] });
      toast({
        title: "✅ Actualizat",
        description: "Statusul etapei a fost actualizat.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredWorkflows = workflows?.filter((workflow) => {
    if (statusFilter === "all") return true;
    return workflow.overall_status === statusFilter;
  });

  // Generate months pentru dropdown
  const generateMonths = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString("ro-RO", { year: "numeric", month: "long" });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  return (
    <div className="space-y-6">
      {selectedCompanyId !== "all" && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Workflow SEPARAT</strong> pentru acest client - poți customiza complet etapele, termenele și echipa specifică acestei firme.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {generateMonths().map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            <SelectItem value="not_started">Nu început</SelectItem>
            <SelectItem value="in_progress">În lucru</SelectItem>
            <SelectItem value="completed">Finalizat</SelectItem>
            <SelectItem value="overdue">În întârziere</SelectItem>
          </SelectContent>
        </Select>

        {selectedCompanyId !== "all" && (
          <Button
            onClick={() => createWorkflowForCompany.mutate()}
            disabled={createWorkflowForCompany.isPending || !selectedCompany || !defaultTemplate}
            className="ml-auto"
          >
            {createWorkflowForCompany.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Creează Workflow pentru {selectedCompany?.company_name}
          </Button>
        )}
      </div>

      {/* Workflows Grid */}
      {selectedCompanyId === "all" ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">📋 Selectează o companie</p>
            <p className="text-muted-foreground">
              Pentru a gestiona workflow-ul lunar, selectează mai întâi o companie din dropdown-ul de sus.
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
        <div className="grid gap-4">
          {filteredWorkflows.map((workflow) => {
            const stages = workflow.stages as any[] || [];
            return (
              <Card key={workflow.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        🏢 {workflow.companies.company_name}
                        <span className="text-muted-foreground text-base font-normal">
                          - {new Date(selectedMonth + "-01").toLocaleDateString("ro-RO", { year: "numeric", month: "long" }).charAt(0).toUpperCase() + new Date(selectedMonth + "-01").toLocaleDateString("ro-RO", { year: "numeric", month: "long" }).slice(1)}
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Progres: {workflow.progress_percent}% ({stages.filter((s: any) => s.status === "completed").length}/{stages.length} etape completate)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingWorkflow(workflow)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editează Workflow
                      </Button>
                      {getStatusBadge(workflow)}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    {stages
                      .sort((a: any, b: any) => a.stage_number - b.stage_number)
                      .map((stage: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 hover:bg-accent rounded-md cursor-pointer transition-colors border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-lg">{getStageIcon(stage)}</span>
                            <div className="flex-1">
                              <p className="font-medium">
                                {stage.stage_number}. {stage.stage_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {stage.estimated_days} zile estimate
                                {stage.started_at && ` • început ${new Date(stage.started_at).toLocaleDateString("ro-RO")}`}
                                {stage.completed_at && ` • finalizat ${new Date(stage.completed_at).toLocaleDateString("ro-RO")}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {stage.status !== "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStageStatus.mutate({
                                    workflowId: workflow.id,
                                    stageIndex: index,
                                    newStatus: stage.status === "in_progress" ? "not_started" : "in_progress",
                                    assignedMemberId: stage.assigned_member_id,
                                  })}
                                  disabled={updateStageStatus.isPending}
                                >
                                  {stage.status === "in_progress" ? "⏸️ Pauză" : "▶️ Start"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => updateStageStatus.mutate({
                                    workflowId: workflow.id,
                                    stageIndex: index,
                                    newStatus: "completed",
                                    assignedMemberId: stage.assigned_member_id,
                                  })}
                                  disabled={updateStageStatus.isPending}
                                >
                                  ✅ Finalizează
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Nu există workflow pentru luna selectată.
            </p>
            <Button
              onClick={() => createWorkflowForCompany.mutate()}
              disabled={createWorkflowForCompany.isPending || !selectedCompany}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Creează Workflow
            </Button>
          </div>
        </Card>
      )}

      {editingWorkflow && (
        <EditWorkflowDialog
          workflow={editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
        />
      )}
    </div>
  );
};
