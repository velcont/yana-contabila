import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Send, Trash2, Mail, History, Download } from "lucide-react";

export default function UpdatesManager() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
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
        is_published: false,
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

  // Publish update
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_updates')
        .update({ 
          is_published: true, 
          published_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-updates'] });
      toast.success("Update publicat!");
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
  const publishedUpdates = updates?.filter(u => u.is_published) || [];

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
        <h1 className="text-3xl font-bold">Manager Update-uri Aplicație</h1>
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
              <Label>Versiune (opțional)</Label>
              <Input
                placeholder="1.2.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
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
              disabled={!title || !description || createMutation.isPending}
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
                        <div>
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
                        <Badge variant="default">Publicat</Badge>
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

      {/* Draft Updates List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Update-uri Draft (Nepublicate)</CardTitle>
          <CardDescription>Gestionează update-urile care nu au fost încă publicate</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Se încarcă...</p>
          ) : updates && updates.filter(u => !u.is_published).length > 0 ? (
            <div className="space-y-4">
              {updates.filter(u => !u.is_published).map((update) => (
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
                      <Badge variant="secondary">Draft</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {update.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate(update.id)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Publică
                    </Button>
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
              Toate update-urile au fost publicate
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
