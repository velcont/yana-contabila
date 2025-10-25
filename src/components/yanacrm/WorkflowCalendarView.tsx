import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { MonthlyWorkflowStageDialog } from "./MonthlyWorkflowStageDialog";
import { Badge } from "@/components/ui/badge";

export const WorkflowCalendarView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStage, setSelectedStage] = useState<any>(null);

  // Fetch workflows pentru luna selectată
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["monthly-workflows", selectedMonth, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_workflow_instances")
        .select(`
          *,
          companies!inner(company_name),
          monthly_workflow_stages(
            *,
            workflow_team_members(member_name, member_email)
          )
        `)
        .eq("month_year", selectedMonth)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch toate companiile pentru create bulk
  const { data: companies } = useQuery({
    queryKey: ["accountant-companies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("managed_by_accountant_id", user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

  // Mutation pentru create bulk workflows
  const createBulkWorkflows = useMutation({
    mutationFn: async () => {
      if (!companies || !defaultTemplate) {
        throw new Error("Nu există companii sau șablon default");
      }

      const workflowsToCreate = companies.map((company) => ({
        company_id: company.id,
        accountant_id: user!.id,
        template_id: defaultTemplate.id,
        month_year: selectedMonth,
        overall_status: "not_started",
      }));

      const { data: createdWorkflows, error: workflowError } = await supabase
        .from("monthly_workflow_instances")
        .insert(workflowsToCreate)
        .select();

      if (workflowError) throw workflowError;

      // Creează etapele pentru fiecare workflow
      const stages = defaultTemplate.stages as any[];
      const stagesToCreate = createdWorkflows.flatMap((workflow) =>
        stages.map((stage) => ({
          workflow_instance_id: workflow.id,
          stage_number: stage.stage_number,
          stage_name: stage.stage_name,
          estimated_days: stage.estimated_days,
          status: "not_started",
        }))
      );

      const { error: stagesError } = await supabase
        .from("monthly_workflow_stages")
        .insert(stagesToCreate);

      if (stagesError) throw stagesError;

      return createdWorkflows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-workflows"] });
      toast({
        title: "✅ Workflow-uri create cu succes!",
        description: `Au fost create workflow-uri pentru ${count} ${count === 1 ? "companie" : "companii"}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare la creare workflow-uri",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (workflow: any) => {
    const totalStages = workflow.monthly_workflow_stages?.length || 0;
    const completedStages = workflow.monthly_workflow_stages?.filter((s: any) => s.status === "completed").length || 0;
    
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
    return "⏳";
  };

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

        <Button
          onClick={() => createBulkWorkflows.mutate()}
          disabled={createBulkWorkflows.isPending || !companies?.length}
          className="ml-auto"
        >
          {createBulkWorkflows.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Creează Workflow pentru Toate Companiile
        </Button>
      </div>

      {/* Workflows Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
        <div className="grid gap-4">
          {filteredWorkflows.map((workflow) => (
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
                  </div>
                  {getStatusBadge(workflow)}
                </div>

                <div className="border-t pt-4 space-y-2">
                  {workflow.monthly_workflow_stages
                    ?.sort((a: any, b: any) => a.stage_number - b.stage_number)
                    .map((stage: any) => (
                      <div
                        key={stage.id}
                        onClick={() => setSelectedStage({ ...stage, workflow })}
                        className="flex items-center justify-between p-3 hover:bg-accent rounded-md cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getStageIcon(stage)}</span>
                          <div>
                            <p className="font-medium">
                              {stage.stage_number}. {stage.stage_name}
                            </p>
                            {stage.workflow_team_members && (
                              <p className="text-sm text-muted-foreground">
                                {stage.workflow_team_members.member_name}
                                {stage.completed_at && ` - ${new Date(stage.completed_at).toLocaleDateString("ro-RO")}`}
                                {stage.started_at && !stage.completed_at && ` - început ${new Date(stage.started_at).toLocaleDateString("ro-RO")}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {stage.status === "in_progress" && stage.started_at && (
                          (() => {
                            const daysPassed = Math.floor(
                              (new Date().getTime() - new Date(stage.started_at).getTime()) / (1000 * 60 * 60 * 24)
                            );
                            const isOverdue = daysPassed > stage.estimated_days;
                            if (isOverdue) {
                              return (
                                <Badge variant="destructive" className="text-xs">
                                  ⚠️ Întârziere: {daysPassed - stage.estimated_days} {daysPassed - stage.estimated_days === 1 ? "zi" : "zile"}
                                </Badge>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Nu există workflow-uri pentru luna selectată.
            </p>
            <Button
              onClick={() => createBulkWorkflows.mutate()}
              disabled={createBulkWorkflows.isPending || !companies?.length}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Creează Workflow-uri
            </Button>
          </div>
        </Card>
      )}

      {/* Stage Dialog */}
      {selectedStage && (
        <MonthlyWorkflowStageDialog
          stage={selectedStage}
          workflow={selectedStage.workflow}
          onClose={() => setSelectedStage(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["monthly-workflows"] });
            setSelectedStage(null);
          }}
        />
      )}
    </div>
  );
};
