import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, UserX, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLE_OPTIONS = [
  { value: "receptionist", label: "Recepționist" },
  { value: "junior_accountant", label: "Contabil Junior" },
  { value: "hr_accountant", label: "Contabil HR" },
  { value: "senior_accountant", label: "Contabil Senior" },
  { value: "declarations_accountant", label: "Contabil Declarații" },
];

interface WorkflowTeamManagerProps {
  selectedCompanyId?: string;
}

export const WorkflowTeamManager = ({ selectedCompanyId = "all" }: WorkflowTeamManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningMember, setAssigningMember] = useState<any>(null);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("junior_accountant");
  const [isActive, setIsActive] = useState(true);

  // Fetch team members globali
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_team_members")
        .select("*")
        .eq("accountant_id", user!.id)
        .order("member_name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch asignări per companie (dacă e selectată o companie)
  const { data: companyAssignments } = useQuery({
    queryKey: ["company-assignments", selectedCompanyId, user?.id],
    queryFn: async () => {
      if (selectedCompanyId === "all") return [];

      const { data, error } = await supabase
        .from("company_team_assignments")
        .select(`
          *,
          workflow_team_members(member_name, member_email, member_role)
        `)
        .eq("company_id", selectedCompanyId)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user && selectedCompanyId !== "all",
  });

  // Create/Update mutation
  const saveMember = useMutation({
    mutationFn: async () => {
      const memberData = {
        accountant_id: user!.id,
        member_name: memberName,
        member_email: memberEmail,
        member_role: memberRole,
        is_active: isActive,
      };

      if (editingMember) {
        const { error } = await supabase
          .from("workflow_team_members")
          .update(memberData)
          .eq("id", editingMember.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workflow_team_members")
          .insert(memberData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: editingMember ? "✅ Membru actualizat" : "✅ Membru adăugat",
        description: "Membrul echipei a fost salvat cu succes.",
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

  // Deactivate mutation
  const deactivateMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_team_members")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "✅ Membru dezactivat",
        description: "Membrul a fost dezactivat cu succes.",
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

  const resetForm = () => {
    setMemberName("");
    setMemberEmail("");
    setMemberRole("junior_accountant");
    setIsActive(true);
    setEditingMember(null);
  };

  const openEditDialog = (member: any) => {
    setEditingMember(member);
    setMemberName(member.member_name);
    setMemberEmail(member.member_email);
    setMemberRole(member.member_role);
    setIsActive(member.is_active);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Echipa Mea</h3>
          {selectedCompanyId !== "all" ? (
            <p className="text-sm text-muted-foreground mt-1">
              Membri asignați pentru compania selectată
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Toți membrii echipei (selectează o companie pentru asignări)
            </p>
          )}
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Adaugă Membru Nou
        </Button>
      </div>

      {selectedCompanyId !== "all" && companyAssignments && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Echipa asignată acestei companii
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {companyAssignments.length} {companyAssignments.length === 1 ? "membru asignat" : "membri asignați"} pentru această companie
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : teamMembers && teamMembers.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.member_name}</TableCell>
                  <TableCell>{member.member_email}</TableCell>
                  <TableCell>{getRoleLabel(member.member_role)}</TableCell>
                  <TableCell>
                    {member.is_active ? (
                      <Badge className="bg-green-500">✅ Activ</Badge>
                    ) : (
                      <Badge variant="secondary">⏸️ Inactiv</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {member.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateMember.mutate(member.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Nu există membri adăugați în echipă.</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă primul membru
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editează Membru" : "Adaugă Membru Nou"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nume complet</Label>
              <Input
                id="name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Ex: Ana Popescu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="ana@firma.ro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger id="role">
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Membru activ
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => saveMember.mutate()}
                disabled={saveMember.isPending || !memberName || !memberEmail}
                className="flex-1"
              >
                {saveMember.isPending ? (
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
    </div>
  );
};
