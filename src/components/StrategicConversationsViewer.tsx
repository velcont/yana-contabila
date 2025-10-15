import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Search, User, Calendar, MessageSquare, Eye, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface StrategicConversation {
  id: string;
  user_id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  metadata: any;
  profiles: Profile;
}

export const StrategicConversationsViewer = () => {
  const [conversations, setConversations] = useState<StrategicConversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("email");

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load strategic advisor conversations
      // Acestea sunt salvate în conversation_history cu metadata care ar putea indica sursa
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversation_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      // Enrich with profile data
      const enriched = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("id", conv.user_id)
            .single();
          
          return {
            ...conv,
            profiles: profile || { id: conv.user_id, email: "Unknown", full_name: null }
          };
        })
      );

      // Pentru moment, afișăm toate conversațiile
      // În viitor, putem filtra pe baza metadata sau a unui câmp specific
      setConversations(enriched as StrategicConversation[]);
      
      // Log audit: admin a accesat lista de conversații
      await logAuditAccess("strategic_conversations_list", null);
    } catch (error) {
      console.error("Error loading strategic conversations:", error);
      toast.error("Eroare la încărcarea conversațiilor");
    } finally {
      setLoading(false);
    }
  };

  const logAuditAccess = async (action: string, conversationId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('log_audit_event', {
        p_action_type: `ADMIN_${action.toUpperCase()}`,
        p_table_name: 'conversation_history',
        p_record_id: conversationId,
        p_metadata: {
          timestamp: new Date().toISOString(),
          admin_email: user.email,
          note: 'Admin accessed strategic advisor conversations for monitoring'
        }
      });
    } catch (error) {
      console.error("Error logging audit:", error);
    }
  };

  const handleViewConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    await logAuditAccess("view_conversation", conversationId);
    toast.success("Conversație selectată - acces înregistrat în audit log");
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesUser = selectedUser === "all" || conv.user_id === selectedUser;
    const matchesSearch = !searchText || 
      conv.content.toLowerCase().includes(searchText.toLowerCase()) ||
      conv.profiles.email.toLowerCase().includes(searchText.toLowerCase());
    return matchesUser && matchesSearch;
  });

  // Group by conversation_id
  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    if (!acc[conv.conversation_id]) {
      acc[conv.conversation_id] = [];
    }
    acc[conv.conversation_id].push(conv);
    return acc;
  }, {} as Record<string, StrategicConversation[]>);

  // Sort conversation groups by date
  const sortedConversationIds = Object.keys(groupedConversations).sort((a, b) => {
    const aDate = new Date(groupedConversations[a][0].created_at).getTime();
    const bDate = new Date(groupedConversations[b][0].created_at).getTime();
    return dateSort === "desc" ? bDate - aDate : aDate - bDate;
  });

  // Get conversation details for selected conversation
  const selectedConvMessages = selectedConversation 
    ? groupedConversations[selectedConversation]?.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ) 
    : null;

  if (loading) {
    return <div className="text-center py-8">Se încarcă...</div>;
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          <strong>Monitoring Strategic Advisor:</strong> Toate accesările sunt înregistrate în audit logs.
          Respectați confidențialitatea utilizatorilor și utilizați aceste informații doar pentru suport și îmbunătățiri.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Filtre și Căutare</CardTitle>
          <CardDescription>
            Filtrează conversațiile din Strategic Advisor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Utilizator
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți utilizatorii</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sortare după dată
              </label>
              <Select value={dateSort} onValueChange={(v) => setDateSort(v as "desc" | "asc")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Cele mai recente</SelectItem>
                  <SelectItem value="asc">Cele mai vechi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Căutare text
              </label>
              <Input
                placeholder="Caută în conversații..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>{sortedConversationIds.length} conversații</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{new Set(filteredConversations.map(c => c.user_id)).size} utilizatori unici</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedConvMessages ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detalii Conversație</CardTitle>
                <CardDescription>
                  {selectedConvMessages[0]?.profiles.email} - {format(new Date(selectedConvMessages[0]?.created_at), "dd MMM yyyy HH:mm", { locale: ro })}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {selectedConvMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-lg p-4 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                            {msg.role === 'user' ? 'Utilizator' : 'Strategic Advisor'}
                          </Badge>
                          <span className="text-xs opacity-70">
                            {format(new Date(msg.created_at), "HH:mm", { locale: ro })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista Conversații Strategic Advisor</CardTitle>
            <CardDescription>
              Selectează o conversație pentru a vedea detalii complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {sortedConversationIds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nu au fost găsite conversații cu criteriile selectate
                  </div>
                ) : (
                  sortedConversationIds.map((convId) => {
                    const messages = groupedConversations[convId];
                    const firstMessage = messages[0];
                    const lastMessage = messages[messages.length - 1];
                    const userMessage = messages.find(m => m.role === 'user');
                    
                    return (
                      <Card 
                        key={convId} 
                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => handleViewConversation(convId)}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{firstMessage.profiles.email}</span>
                                  <Badge variant="outline">{messages.length} mesaje</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {userMessage?.content.substring(0, 150) || "..."}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(firstMessage.created_at), "dd MMM yyyy HH:mm", { locale: ro })}
                              </div>
                              {lastMessage.created_at !== firstMessage.created_at && (
                                <div>
                                  Ultima activitate: {format(new Date(lastMessage.created_at), "dd MMM HH:mm", { locale: ro })}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};