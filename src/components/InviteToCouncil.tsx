import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface InviteToCouncilProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export const InviteToCouncil = ({ open, onOpenChange, onInviteSent }: InviteToCouncilProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "advisor" as "advisor" | "partner" | "accountant" | "observer",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.email.trim()) {
      toast.error("Te rog completează email-ul");
      return;
    }

    setIsLoading(true);
    try {
      // Create invitation
      const { data: invitation, error: inviteError } = await (supabase as any)
        .from('strategic_invitations')
        .insert({
          entrepreneur_id: user.id,
          member_email: formData.email.trim(),
          member_name: formData.name.trim() || null,
          role: formData.role,
          message: formData.message.trim() || null
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Create council member entry
      const { error: memberError } = await (supabase as any)
        .from('strategic_council_members')
        .insert({
          entrepreneur_id: user.id,
          member_email: formData.email.trim(),
          member_name: formData.name.trim() || null,
          role: formData.role,
          status: 'pending'
        });

      if (memberError) throw memberError;

      // Send invitation email
      await supabase.functions.invoke('send-council-invitation', {
        body: {
          to_email: formData.email,
          to_name: formData.name || formData.email,
          invitation_token: invitation?.invitation_token,
          role: formData.role,
          message: formData.message
        }
      });

      toast.success(`Invitație trimisă către ${formData.email}`);
      setFormData({ email: "", name: "", role: "advisor", message: "" });
      onOpenChange(false);
      onInviteSent();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Eroare la trimiterea invitației");
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabels = {
    advisor: "Consultant Fiscal",
    partner: "Partener de Afaceri",
    accountant: "Contabil",
    observer: "Observator"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invită în Consiliul Strategic
          </DialogTitle>
          <DialogDescription>
            Invită consultanți fiscali, parteneri sau contabili să colaboreze la strategiile tale
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplu@email.ro"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nume (opțional)</Label>
            <Input
              id="name"
              placeholder="Ion Popescu"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol în consiliu</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mesaj personal (opțional)</Label>
            <Textarea
              id="message"
              placeholder="Aș aprecia colaborarea ta în dezvoltarea strategiei noastre..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Trimite Invitația
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
