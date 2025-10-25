import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STAGE_NAMES = [
  "PRIMIRE DOCUMENTE",
  "INTRODUCERE ACTE PRIMARE",
  "SALARIZARE (HR)",
  "VERIFICARE BALANȚĂ",
  "DECLARAȚII",
];

const ROLE_OPTIONS = [
  { value: "receptionist", label: "Recepționist" },
  { value: "junior_accountant", label: "Contabil Junior" },
  { value: "hr_accountant", label: "Contabil HR" },
  { value: "senior_accountant", label: "Contabil Senior" },
  { value: "declarations_accountant", label: "Contabil Declarații" },
];

export const WorkflowTemplateManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  const [templateName, setTemplateName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [stages, setStages] = useState(
    STAGE_NAMES.map((name, index) => ({
      stage_number: index + 1,
      stage_name: name,
      default_responsible_role: index === 0 ? "receptionist" : "junior_accountant",
      estimated_days: index === 0 ? 1 : 2,
    }))
  );

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["workflow-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_workflow_templates")
        .select("*")
        .eq("accountant_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create/Update mutation
  const saveTemplate = useMutation({
    mutationFn: async () => {
      const templateData = {
        accountant_id: user!.id,
        template_name: templateName,
        is_default: isDefault,
        stages,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("monthly_workflow_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monthly_workflow_templates")
          .insert(templateData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: editingTemplate ? "✅ Șablon actualizat" : "✅ Șablon creat",
        description: "Șablonul a fost salvat cu succes.",
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("monthly_workflow_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: "✅ Șablon șters",
        description: "Șablonul a fost șters cu succes.",
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTemplateName("");
    setIsDefault(false);
    setStages(
      STAGE_NAMES.map((name, index) => ({
        stage_number: index + 1,
        stage_name: name,
        default_responsible_role: index === 0 ? "receptionist" : "junior_accountant",
        estimated_days: index === 0 ? 1 : 2,
      }))
    );
    setEditingTemplate(null);
  };

  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setTemplateName(template.template_name);
    setIsDefault(template.is_default);
    setStages(template.stages);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Șabloane Workflow</h3>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Creează Șablon Nou
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{template.template_name}</h4>
                    {template.is_default && (
                      <Badge className="bg-yellow-500 flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(template.stages as any[]).length} etape definite
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTemplateToDelete(template);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Nu există șabloane create.</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Creează primul șablon
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editează Șablon" : "Creează Șablon Nou"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nume șablon</Label>
              <Input
                id="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Proces Standard Lunar 2025"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <Label htmlFor="default" className="cursor-pointer">
                Setează ca șablon implicit
              </Label>
            </div>

            <div className="space-y-4">
              <Label>Etape workflow</Label>
              {stages.map((stage, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="font-medium">
                      {stage.stage_number}. {stage.stage_name}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rol responsabil default</Label>
                        <Select
                          value={stage.default_responsible_role}
                          onValueChange={(value) => {
                            const newStages = [...stages];
                            newStages[index].default_responsible_role = value;
                            setStages(newStages);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Zile estimate</Label>
                        <Input
                          type="number"
                          min="1"
                          value={stage.estimated_days}
                          onChange={(e) => {
                            const newStages = [...stages];
                            newStages[index].estimated_days = parseInt(e.target.value) || 1;
                            setStages(newStages);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => saveTemplate.mutate()}
                disabled={saveTemplate.isPending || !templateName}
                className="flex-1"
              >
                {saveTemplate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Salvează
              </Button>
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                variant="outline"
              >
                Anulează
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sigur vrei să ștergi acest șablon?</AlertDialogTitle>
            <AlertDialogDescription>
              Workflow-urile existente create din acest șablon vor rămâne neschimbate.
              Această acțiune este permanentă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteTemplate.mutate(templateToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
