import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  company_id: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  companies?: { company_name: string };
}

export const CRMMessagingManager = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("companies")
      .select("id, company_name, user_id")
      .eq("managed_by_accountant_id", user.id);
    
    setCompanies(data || []);
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("crm_messages")
        .select("*, companies(company_name)")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
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

  const handleSendMessage = async () => {
    if (!selectedCompany || !subject || !messageText) {
      toast({
        title: "Eroare",
        description: "Completează toate câmpurile",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const company = companies.find(c => c.id === selectedCompany);
      if (!company) throw new Error("Client negăsit");

      const { error } = await supabase
        .from("crm_messages")
        .insert([{
          sender_id: user.id,
          recipient_id: company.user_id,
          company_id: selectedCompany,
          subject: subject,
          message: messageText,
          is_internal: false,
        }]);

      if (error) throw error;

      toast({ title: "Mesaj trimis cu succes!" });
      setSubject("");
      setMessageText("");
      setSelectedCompany("");
      fetchMessages();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("crm_messages")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) throw error;
      fetchMessages();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Mesagerie CRM
        </h2>
        <p className="text-muted-foreground mt-1">
          Comunică direct cu clienții tăi
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Mesaj Nou */}
        <Card>
          <CardHeader>
            <CardTitle>Mesaj Nou</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Către Client</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează client" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subiect</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ex: Solicitare documente"
              />
            </div>

            <div className="space-y-2">
              <Label>Mesaj</Label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                placeholder="Scrie mesajul aici..."
              />
            </div>

            <Button onClick={handleSendMessage} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Trimite Mesaj
            </Button>
          </CardContent>
        </Card>

        {/* Lista Mesaje */}
        <Card>
          <CardHeader>
            <CardTitle>Istoric Mesaje</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="text-center py-8">Se încarcă...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Niciun mesaj
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <Card key={msg.id} className={!msg.is_read ? "border-primary" : ""}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              {msg.companies?.company_name || "Client"}
                            </span>
                          </div>
                          {!msg.is_read && (
                            <Badge variant="default" className="text-xs">Nou</Badge>
                          )}
                        </div>
                        <h4 className="font-semibold mb-2">{msg.subject}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{msg.message}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                          {!msg.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(msg.id)}
                            >
                              Marchează ca citit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};