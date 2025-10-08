import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Send, Trash2, Mail, History, Download, Play, CheckCircle2, FileText, ArrowLeft } from "lucide-react";

export default function UpdatesManager() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState<"draft" | "in_progress" | "published">("draft");
  const queryClient = useQueryClient();

  // Fetch updates
  const { data: updates, isLoading } = useQuery({
    queryKey: ['app-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create update
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nu ești autentificat");

      const { error } = await supabase.from('app_updates').insert({
        title,
        description,
        version: version || null,
        created_by: userData.user.id,
        is_published: status === "published",
        status: status,
        include_in_next_email: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-updates'] });
      toast.success("Update creat cu succes!");
      setTitle("");
      setDescription("");
      setVersion("");
      setStatus("draft");
    },
    onError: (error: any) => {
      toast.error("Eroare: " + error.message);
    },
  });

  // Toggle include in email
  const toggleEmailMutation = useMutation({
    mutationFn: async ({ id, currentValue }: { id: string; currentValue: boolean }) => {
      const { error } = await supabase
        .from('app_updates')
        .update({ include_in_next_email: !currentValue })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-updates'] });
      toast.success("Setare actualizată!");
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const updates: any = { status: newStatus };
      
      if (newStatus === "published") {
        updates.is_published = true;
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('app_updates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-updates'] });
      toast.success("Status actualizat!");
    },
  });

  // Delete update
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_updates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-updates'] });
      toast.success("Update șters!");
    },
  });

  // Send email
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('send-weekly-alerts');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-updates'] });
      toast.success("Email-uri trimise cu succes!");
    },
    onError: (error: any) => {
      toast.error("Eroare la trimitere: " + error.message);
    },
  });

  const updatesToEmail = updates?.filter(u => u.include_in_next_email && u.is_published) || [];
  const publishedUpdates = updates?.filter(u => u.status === "published") || [];
  const inProgressUpdates = updates?.filter(u => u.status === "in_progress") || [];
  const draftUpdates = updates?.filter(u => u.status === "draft") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Publicat</Badge>;
      case "in_progress":
        return <Badge className="bg-warning text-warning-foreground"><Play className="h-3 w-3 mr-1" />În Lucru</Badge>;
      default:
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
    }
  };

  // Export changelog as markdown
  const exportChangelog = () => {
    if (!publishedUpdates.length) {
      toast.error("Niciun update publicat pentru export");
      return;
    }

    const markdown = `# Changelog Yana\n\n${publishedUpdates
      .map(
        (update) =>
          `## ${update.version ? `v${update.version}` : new Date(update.published_at || update.created_at).toLocaleDateString('ro-RO')}\n**${update.title}**\n\n${update.description}\n\n---\n`
      )
      .join('\n')}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'changelog-yana.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Changelog exportat!");
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Manager Update-uri Aplicație</h1>
        </div>
        <Button variant="outline" onClick={exportChangelog}>
          <Download className="h-4 w-4 mr-2" />
          Export Changelog
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Update */}
        <Card>
          <CardHeader>
            <CardTitle>Crează Update Nou</CardTitle>
            <CardDescription>Adaugă un update pentru utilizatori</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Versiune *</Label>
              <Input
                placeholder="1.5.0 (semantic versioning)"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: MAJOR.MINOR.PATCH (ex: 1.5.0)
              </p>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">În Lucru</SelectItem>
                  <SelectItem value="published">Publicat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titlu</Label>
              <Input
                placeholder="Funcționalitate nouă..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Descriere</Label>
              <Textarea
                placeholder="Detalii despre update..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title || !description || !version || createMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Creează Update
            </Button>
          </CardContent>
        </Card>

        {/* Send Email Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Trimite Email Update-uri</CardTitle>
            <CardDescription>
              {updatesToEmail.length > 0
                ? `${updatesToEmail.length} update-uri vor fi trimise`
                : "Niciun update selectat pentru email"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {updatesToEmail.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {updatesToEmail.map((update) => (
                    <div key={update.id} className="p-3 bg-muted rounded-md">
                      <p className="font-medium text-sm">
                        {update.version && `v${update.version} - `}
                        {update.title}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => sendEmailMutation.mutate()}
                  disabled={sendEmailMutation.isPending}
                  className="w-full"
                  variant="default"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendEmailMutation.isPending
                    ? "Se trimit email-uri..."
                    : "Trimite Email la Toți Utilizatorii"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Selectează update-urile de mai jos pentru a le include în email
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Changelog - Published Updates */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Changelog - Istoric Update-uri Publicate</CardTitle>
          </div>
          <CardDescription>
            Toate modificările publicate în ordine cronologică ({publishedUpdates.length} update-uri)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Se încarcă...</p>
          ) : publishedUpdates.length > 0 ? (
            <div className="space-y-6">
              {publishedUpdates.map((update, index) => (
                <div key={update.id} className="relative">
                  {index !== publishedUpdates.length - 1 && (
                    <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm z-10">
                      {update.version ? `v${update.version.split('.')[0]}` : index + 1}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {update.version && `v${update.version} - `}
                            {update.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(update.published_at || update.created_at).toLocaleDateString('ro-RO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(update.status || "published")}
                          <div className="flex items-center gap-2 ml-4">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Switch
                              checked={update.include_in_next_email || false}
                              onCheckedChange={() => toggleEmailMutation.mutate({ 
                                id: update.id, 
                                currentValue: update.include_in_next_email || false 
                              })}
                            />
                            <span className="text-xs text-muted-foreground">Email</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {update.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Niciun update publicat încă
            </p>
          )}
        </CardContent>
      </Card>

      {/* In Progress Updates */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-warning" />
            Update-uri În Lucru ({inProgressUpdates.length})
          </CardTitle>
          <CardDescription>Versiuni pe care lucrezi activ</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Se încarcă...</p>
          ) : inProgressUpdates.length > 0 ? (
            <div className="space-y-4">
              {inProgressUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start justify-between p-4 border-l-4 border-warning rounded-lg bg-warning/5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {update.version && `v${update.version} - `}
                        {update.title}
                      </h3>
                      {getStatusBadge(update.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {update.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creat: {new Date(update.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Select
                      value={update.status}
                      onValueChange={(value) => updateStatusMutation.mutate({ id: update.id, newStatus: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">În Lucru</SelectItem>
                        <SelectItem value="published">Publicat</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(update.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nicio versiune în lucru
            </p>
          )}
        </CardContent>
      </Card>

      {/* Draft Updates List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Update-uri Draft ({draftUpdates.length})
          </CardTitle>
          <CardDescription>Idei și planuri pentru viitoare update-uri</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Se încarcă...</p>
          ) : draftUpdates.length > 0 ? (
            <div className="space-y-4">
              {draftUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {update.version && `v${update.version} - `}
                        {update.title}
                      </h3>
                      {getStatusBadge(update.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {update.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creat: {new Date(update.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Select
                      value={update.status}
                      onValueChange={(value) => updateStatusMutation.mutate({ id: update.id, newStatus: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">În Lucru</SelectItem>
                        <SelectItem value="published">Publicat</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(update.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Niciun draft
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
