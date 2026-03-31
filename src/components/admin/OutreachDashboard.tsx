import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Send, RefreshCw, Users, Mail, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface Lead {
  id: string;
  company_name: string;
  email: string;
  website: string | null;
  city: string | null;
  industry: string | null;
  source: string;
  status: string;
  email_sent_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  consent_sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  opted_in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  presentation_sent: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  converted: "bg-primary/20 text-primary",
  unsubscribed: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  new: "Nou",
  consent_sent: "Consimțământ trimis",
  opted_in: "✅ A acceptat",
  presentation_sent: "Prezentare trimisă",
  converted: "Convertit",
  unsubscribed: "Dezabonat",
};

export const OutreachDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [prospecting, setProspecting] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('outreach_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Eroare la încărcarea lead-urilor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleProspect = async () => {
    setProspecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('yana-prospector');
      if (error) throw error;
      toast.success(`Prospectat: ${data?.newLeadsInserted || 0} lead-uri noi găsite`);
      fetchLeads();
    } catch (error: any) {
      console.error("Prospecting error:", error);
      toast.error("Eroare la prospectare: " + (error.message || "Necunoscut"));
    } finally {
      setProspecting(false);
    }
  };

  const handleSendBatch = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('yana-outreach-sender');
      if (error) throw error;
      toast.success(`Trimise: ${data?.sent || 0} emailuri`);
      fetchLeads();
    } catch (error: any) {
      console.error("Send error:", error);
      toast.error("Eroare la trimitere: " + (error.message || "Necunoscut"));
    } finally {
      setSending(false);
    }
  };

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    consentSent: leads.filter(l => l.status === 'consent_sent').length,
    optedIn: leads.filter(l => l.status === 'opted_in' || l.status === 'presentation_sent').length,
    unsubscribed: leads.filter(l => l.status === 'unsubscribed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Lead-uri</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Search className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.new}</p>
            <p className="text-xs text-muted-foreground">Noi (necontactați)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.consentSent}</p>
            <p className="text-xs text-muted-foreground">Consimțământ trimis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.optedIn}</p>
            <p className="text-xs text-muted-foreground">Au acceptat (opt-in)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{stats.unsubscribed}</p>
            <p className="text-xs text-muted-foreground">Dezabonați</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleProspect} disabled={prospecting}>
          {prospecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          Caută firme noi
        </Button>
        <Button onClick={handleSendBatch} disabled={sending} variant="default">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Trimite batch acum
        </Button>
        <Button onClick={fetchLeads} variant="outline" disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Leads table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead-uri Outreach</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Niciun lead încă. Apasă "Caută firme noi" pentru a începe.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firmă</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Oraș</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trimis la</TableHead>
                    <TableHead>Adăugat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                            {lead.company_name}
                          </a>
                        ) : lead.company_name}
                      </TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="text-sm">{lead.city || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[lead.status] || ''} variant="secondary">
                          {statusLabels[lead.status] || lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.email_sent_at
                          ? format(new Date(lead.email_sent_at), 'dd MMM yyyy HH:mm', { locale: ro })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: ro })}
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

export default OutreachDashboard;
