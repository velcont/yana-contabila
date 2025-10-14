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
import { Calendar, Plus, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FiscalDeadline {
  id: string;
  company_id: string | null;
  declaration_name: string;
  declaration_type: string;
  due_date: string;
  period: string;
  status: string;
  priority: string;
  notes: string;
  companies?: { company_name: string };
}

export const FiscalDeadlinesManager = () => {
  const [deadlines, setDeadlines] = useState<FiscalDeadline[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    company_id: "",
    declaration_name: "",
    declaration_type: "D300",
    due_date: "",
    period: "",
    priority: "normal",
    notes: "",
  });

  useEffect(() => {
    fetchDeadlines();
    fetchCompanies();
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

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("fiscal_deadlines")
        .select("*, companies(company_name)")
        .eq("accountant_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setDeadlines(data || []);
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
    if (!formData.declaration_name || !formData.due_date) {
      toast({
        title: "Eroare",
        description: "Completează câmpurile obligatorii",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const { error } = await supabase
        .from("fiscal_deadlines")
        .insert([{
          accountant_id: user.id,
          company_id: formData.company_id || null,
          declaration_name: formData.declaration_name,
          declaration_type: formData.declaration_type,
          due_date: formData.due_date,
          period: formData.period || null,
          priority: formData.priority,
          notes: formData.notes || null,
          status: "pending",
        }]);

      if (error) throw error;

      toast({ title: "Termen fiscal adăugat cu succes!" });
      setDialogOpen(false);
      resetForm();
      fetchDeadlines();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const { error } = await supabase
        .from("fiscal_deadlines")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Termen marcat ca finalizat!" });
      fetchDeadlines();
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
      company_id: "",
      declaration_name: "",
      declaration_type: "D300",
      due_date: "",
      period: "",
      priority: "normal",
      notes: "",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "normal": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "completed") {
      return <Badge variant="default" className="bg-green-500">Finalizat</Badge>;
    }
    
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return <Badge variant="destructive">Depășit</Badge>;
    } else if (daysUntil <= 3) {
      return <Badge variant="destructive">Urgent</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge variant="secondary">În curând</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Termene Fiscale
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestionează termenele de declarații și obligații fiscale
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Termen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adaugă Termen Fiscal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client (opțional)</Label>
                <Select value={formData.company_id || "all"} onValueChange={(value) => setFormData({ ...formData, company_id: value === "all" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toți clienții" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toți clienții</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nume Declarație *</Label>
                <Input
                  value={formData.declaration_name}
                  onChange={(e) => setFormData({ ...formData, declaration_name: e.target.value })}
                  placeholder="ex: Declarație TVA"
                />
              </div>

              <div className="space-y-2">
                <Label>Tip Declarație</Label>
                <Select value={formData.declaration_type} onValueChange={(value) => setFormData({ ...formData, declaration_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D300">D300 - TVA</SelectItem>
                    <SelectItem value="D390">D390 - Reține la sursă</SelectItem>
                    <SelectItem value="D394">D394 - Declarație unică</SelectItem>
                    <SelectItem value="D100">D100 - Impozit profit</SelectItem>
                    <SelectItem value="D101">D101 - Impozit microîntreprindere</SelectItem>
                    <SelectItem value="custom">Altă declarație</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Scadentă *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perioadă</Label>
                  <Input
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="ex: 01/2025"
                  />
                </div>
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

              <div className="space-y-2">
                <Label>Notițe</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
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
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : deadlines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Niciun termen fiscal găsit
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Declarație</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Data Scadentă</TableHead>
                  <TableHead>Perioadă</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioritate</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlines.map((deadline) => (
                  <TableRow key={deadline.id}>
                    <TableCell className="font-medium">
                      {deadline.declaration_name}
                      <div className="text-xs text-muted-foreground">{deadline.declaration_type}</div>
                    </TableCell>
                    <TableCell>{deadline.companies?.company_name || "Toți clienții"}</TableCell>
                    <TableCell>{new Date(deadline.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>{deadline.period || "-"}</TableCell>
                    <TableCell>{getStatusBadge(deadline.status, deadline.due_date)}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(deadline.priority)}>{deadline.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {deadline.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkComplete(deadline.id)}
                          title="Marchează ca finalizat"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};