import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ShareAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
}

export const ShareAnalysisDialog = ({
  open,
  onOpenChange,
  analysisId,
}: ShareAnalysisDialogProps) => {
  const [newEmail, setNewEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "comment" | "edit">("view");
  const queryClient = useQueryClient();

  // Fetch current shares
  const { data: shares, isLoading } = useQuery({
    queryKey: ['analysis-shares', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_shares')
        .select('*')
        .eq('analysis_id', analysisId);
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Add share mutation
  const addShareMutation = useMutation({
    mutationFn: async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        throw new Error("Email invalid");
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nu ești autentificat");

      const { error } = await supabase
        .from('analysis_shares')
        .insert({
          analysis_id: analysisId,
          owner_id: userData.user.id,
          shared_with_email: newEmail.trim(),
          permission,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-shares', analysisId] });
      toast.success("Analiză partajată cu succes!");
      setNewEmail("");
      setPermission("view");
    },
    onError: (error: any) => {
      toast.error("Eroare la partajare: " + error.message);
    },
  });

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('analysis_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-shares', analysisId] });
      toast.success("Partajare anulată!");
    },
    onError: (error: any) => {
      toast.error("Eroare: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partajează Analiza
          </DialogTitle>
          <DialogDescription>
            Adaugă colaboratori pentru a vizualiza sau comenta această analiză
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new share */}
          <div className="space-y-3">
            <Label>Email Colaborator</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="exemplu@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Vizualizare</SelectItem>
                  <SelectItem value="comment">Comentarii</SelectItem>
                  <SelectItem value="edit">Editare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => addShareMutation.mutate()}
              disabled={!newEmail.trim() || addShareMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addShareMutation.isPending ? "Se adaugă..." : "Adaugă Colaborator"}
            </Button>
          </div>

          {/* Current shares */}
          {shares && shares.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Colaboratori Actuali</Label>
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{share.shared_with_email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{share.permission}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeShareMutation.mutate(share.id)}
                    disabled={removeShareMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Se încarcă...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
