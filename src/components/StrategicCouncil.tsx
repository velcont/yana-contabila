import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { InviteToCouncil } from "./InviteToCouncil";

interface CouncilMember {
  id: string;
  member_email: string;
  member_name: string | null;
  role: string;
  status: string;
  invited_at: string;
  joined_at: string | null;
  last_active_at: string | null;
}

export const StrategicCouncil = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('strategic_council_members')
        .select('*')
        .eq('entrepreneur_id', user.id)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setMembers((data as any) || []);
    } catch (error) {
      console.error("Error loading council members:", error);
      toast.error("Eroare la încărcarea membrilor");
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('strategic_council_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Membru eliminat din consiliu");
      loadMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Eroare la eliminare");
    }
  };

  const roleLabels: Record<string, string> = {
    advisor: "Consultant",
    partner: "Partener",
    accountant: "Contabil",
    observer: "Observator"
  };

  const roleColors: Record<string, string> = {
    advisor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    partner: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    accountant: "bg-green-500/10 text-green-600 dark:text-green-400",
    observer: "bg-gray-500/10 text-gray-600 dark:text-gray-400"
  };

  const statusIcons: Record<string, any> = {
    active: CheckCircle,
    pending: Clock,
    declined: XCircle
  };

  const statusColors: Record<string, string> = {
    active: "text-green-600 dark:text-green-400",
    pending: "text-yellow-600 dark:text-yellow-400",
    declined: "text-red-600 dark:text-red-400"
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Consiliul Strategic
            </CardTitle>
            <Button onClick={() => setShowInviteDialog(true)} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Invită Membru
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Se încarcă...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground mb-4">
                Consiliul tău strategic este gol
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Invită consultanți, parteneri sau contabili pentru a colabora la strategiile tale
              </p>
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Trimite Prima Invitație
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {members.map((member) => {
                  const StatusIcon = statusIcons[member.status];
                  
                  return (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.member_name, member.member_email)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {member.member_name || member.member_email}
                              </p>
                              {member.member_name && (
                                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {member.member_email}
                                </p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => removeMember(member.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Elimină din consiliu
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className={roleColors[member.role]}>
                              {roleLabels[member.role]}
                            </Badge>
                            
                            <div className={`flex items-center gap-1 text-xs ${statusColors[member.status]}`}>
                              <StatusIcon className="w-3 h-3" />
                              {member.status === 'active' && 'Activ'}
                              {member.status === 'pending' && 'În așteptare'}
                              {member.status === 'declined' && 'Refuzat'}
                            </div>
                          </div>

                          {member.last_active_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ultima activitate: {new Date(member.last_active_at).toLocaleDateString('ro-RO')}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <InviteToCouncil
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInviteSent={loadMembers}
      />
    </>
  );
};
