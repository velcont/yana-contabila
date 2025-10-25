import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, User, Paperclip, FileText } from "lucide-react";
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
  attachments?: Array<{
    name: string;
    path: string;
    size: number;
    type: string;
    url: string;
  }>;
  companies?: { company_name: string };
}

export const CRMMessagingManager = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
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
      setMessages((data as any[]) || []);
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

  const uploadAttachments = async (messageId: string): Promise<any[]> => {
    if (attachments.length === 0) return [];
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const uploadedFiles = [];
    
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${selectedCompany}/${messageId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('crm-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error(`Eroare upload ${file.name}:`, error);
        continue;
      }
      
      // Generate signed URL with 30 days expiry
      const { data: urlData } = await supabase.storage
        .from('crm-attachments')
        .createSignedUrl(filePath, 2592000); // 30 days = 2592000 seconds
      
      uploadedFiles.push({
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
        url: urlData?.signedUrl
      });
    }
    
    return uploadedFiles;
  };

  const handleSendMessage = async () => {
    if (!selectedCompany || !subject || !messageText) {
      toast({
        title: "Eroare",
        description: "Completează subiect și mesaj",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingFiles(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const company = companies.find(c => c.id === selectedCompany);
      if (!company) throw new Error("Client negăsit");

      // 1. Insert message in DB (without attachments yet)
      const { data: insertedMessage, error: insertError } = await supabase
        .from("crm_messages")
        .insert([{
          sender_id: user.id,
          recipient_id: company.user_id,
          company_id: selectedCompany,
          subject: subject,
          message: messageText,
          is_internal: false,
          attachments: []
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 2. Upload attachments (if any)
      let uploadedFiles = [];
      if (attachments.length > 0) {
        toast({
          title: "📤 Se încarcă fișierele...",
          description: `Se procesează ${attachments.length} fișier(e)`,
        });

        uploadedFiles = await uploadAttachments(insertedMessage.id);
        
        if (uploadedFiles.length > 0) {
          const { error: updateError } = await supabase
            .from("crm_messages")
            .update({ attachments: uploadedFiles })
            .eq("id", insertedMessage.id);
          
          if (updateError) {
            console.error("Eroare actualizare atașamente:", updateError);
          }
        }
      }

      // 3. Send email through edge function
      toast({
        title: "📧 Se trimite emailul...",
        description: "Salvăm mesajul și trimitem notificarea către client",
      });

      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke(
          "send-crm-message-email",
          {
            body: { message_id: insertedMessage.id }
          }
        );

        if (emailError) {
          console.error("Eroare trimitere email:", emailError);
          toast({
            title: "⚠️ Mesaj salvat, dar email-ul nu a fost trimis",
            description: `Mesajul a fost salvat în sistem, dar nu am putut trimite email către ${company.contact_email || 'client'}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "✅ Mesaj trimis cu succes!",
            description: `Email trimis către ${emailData.email_sent_to}${uploadedFiles.length > 0 ? ` cu ${uploadedFiles.length} atașament(e)` : ''}`,
          });
        }
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
        toast({
          title: "⚠️ Eroare la trimiterea emailului",
          description: "Mesajul este salvat în sistem, dar emailul nu a putut fi trimis.",
          variant: "destructive",
        });
      }

      // 4. Reset form
      setSubject("");
      setMessageText("");
      setSelectedCompany("");
      setAttachments([]);
      fetchMessages();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(false);
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

            <div className="space-y-2">
              <Label>Atașamente (opțional)</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  
                  // Validation: max 10MB per file
                  const invalidFiles = files.filter(f => f.size > 10 * 1024 * 1024);
                  if (invalidFiles.length > 0) {
                    toast({
                      title: "Fișiere prea mari",
                      description: `${invalidFiles.map(f => f.name).join(', ')} depășesc 10MB`,
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setAttachments(files);
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                disabled={uploadingFiles}
              />
              {attachments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {attachments.length} fișier(e) selectat(e):
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {attachments.map((file, idx) => (
                      <li key={idx}>
                        📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button onClick={handleSendMessage} className="w-full" disabled={uploadingFiles}>
              <Send className="h-4 w-4 mr-2" />
              {uploadingFiles ? "Se trimite..." : "Trimite Mesaj"}
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
                        
                        {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium mb-2 flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              Atașamente ({msg.attachments.length})
                            </p>
                            <div className="space-y-1">
                              {msg.attachments.map((att: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  {att.name} ({(att.size / 1024).toFixed(1)} KB)
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
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