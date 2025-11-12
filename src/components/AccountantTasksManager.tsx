import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ListTodo, Plus, Play, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Task {
  id: string;
  title: string;
  description: string;
  company_id: string | null;
  task_type: string;
  status: string;
  priority: string;
  due_date: string;
  estimated_hours: number;
  actual_hours: number;
  companies?: { company_name: string };
}

export const AccountantTasksManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    company_id: "",
    task_type: "accounting",
    priority: "normal",
    due_date: "",
    estimated_hours: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchCompanies();

    // Set up Supabase Realtime subscription for instant task updates (fix audit 1.1)
    const channel = supabase
      .channel('accountant-tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accountant_tasks' },
        (payload) => {
          console.log('📡 Realtime: accountant_tasks changed', payload);
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("managed_by_accountant_id", user.id);
    
    setCompanies(data || []);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("accountant_tasks")
        .select("*, companies(company_name)")
        .eq("assigned_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({
        title: "Eroare",
        description: "Titlul sarcinii este obligatoriu",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const { error } = await supabase
        .from("accountant_tasks")
        .insert([{
          title: formData.title,
          description: formData.description || null,
          company_id: formData.company_id || null,
          task_type: formData.task_type,
          priority: formData.priority,
          due_date: formData.due_date || null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          assigned_to: user.id,
          assigned_by: user.id,
          status: "todo",
        }]);

      if (error) throw error;

      toast({ title: "Sarcină adăugată cu succes!" });
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "in_progress") {
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === "done") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("accountant_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      toast({ title: "Status actualizat!" });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      company_id: "",
      task_type: "accounting",
      priority: "normal",
      due_date: "",
      estimated_hours: "",
    });
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus === "all") return true;
    return task.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      todo: { label: "De făcut", variant: "secondary" },
      in_progress: { label: "În progres", variant: "default" },
      done: { label: "Finalizat", variant: "default" },
    };
    const { label, variant } = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "normal": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <ListTodo className="h-8 w-8" />
            Sarcini Contabile
          </h2>
          <p className="text-muted-foreground mt-1">
            Organizează și urmărește sarcinile tale
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Sarcină
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sarcină Nouă</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titlu *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Pregătire balanță trimestrială"
                />
              </div>

              <div className="space-y-2">
                <Label>Descriere</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={formData.company_id || "general"} onValueChange={(value) => setFormData({ ...formData, company_id: value === "general" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează client (opțional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tip Sarcină</Label>
                  <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accounting">Contabilitate</SelectItem>
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                      <SelectItem value="payroll">Salarizare</SelectItem>
                      <SelectItem value="consulting">Consultanță</SelectItem>
                      <SelectItem value="other">Altele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioritate</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Scăzută</SelectItem>
                      <SelectItem value="normal">Normală</SelectItem>
                      <SelectItem value="high">Ridicată</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Termen</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ore estimate</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    placeholder="ex: 2.5"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Anulează
              </Button>
              <Button onClick={handleSubmit}>Adaugă</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Label>Filtrează:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="todo">De făcut</SelectItem>
                <SelectItem value="in_progress">În progres</SelectItem>
                <SelectItem value="done">Finalizate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nicio sarcină găsită
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sarcină</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Termen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioritate</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {task.title}
                      {task.description && (
                        <div className="text-xs text-muted-foreground mt-1">{task.description}</div>
                      )}
                    </TableCell>
                    <TableCell>{task.companies?.company_name || "General"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.task_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {task.status === "todo" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(task.id, "in_progress")}
                          title="Începe sarcina"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(task.id, "done")}
                          title="Marchează ca finalizat"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {task.estimated_hours && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimated_hours}h
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};