import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Send, Loader2, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useCRMSelection } from "@/contexts/CRMContext";

type Company = {
  id: string;
  company_name: string;
  contact_email: string | null;
  vat_payer: boolean | null;
  tax_type: string | null;
  client_status: string | null;
};

export const EmailBroadcast = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [useFilters, setUseFilters] = useState(false);
  
  // Filtre fiscale
  const [filterByVAT, setFilterByVAT] = useState<"all" | "yes" | "no">("all");
  const [filterByTaxType, setFilterByTaxType] = useState<"all" | "micro" | "profit" | "dividend" | "norma_venit">("all");
  const [filterByStatus, setFilterByStatus] = useState<"all" | "active" | "inactive">("all");
  
  // Companii din context
  const { selectedCompanies, clearSelection } = useCRMSelection();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  // Programare
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState<string>("08:00");
  
  const { toast } = useToast();

  // Încarcă companii când se schimbă filtrele (doar pentru afișare informativă)
  useEffect(() => {
    fetchCompanies();
  }, [filterByVAT, filterByTaxType, filterByStatus, useFilters]);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("companies")
        .select("id, company_name, contact_email, vat_payer, tax_type, client_status")
        .eq("managed_by_accountant_id", user.id)
        .not("contact_email", "is", null);

      // Aplică filtre dacă sunt activate
      if (useFilters) {
        if (filterByVAT === "yes") query = query.eq("vat_payer", true);
        if (filterByVAT === "no") query = query.eq("vat_payer", false);
        
        if (filterByTaxType !== "all") query = query.eq("tax_type", filterByTaxType);
        
        if (filterByStatus === "active") query = query.eq("client_status", "active");
        if (filterByStatus === "inactive") query = query.eq("client_status", "inactive");
      }

      const { data, error } = await query;
      if (error) throw error;

      setCompanies(data || []);
    } catch (error) {
      console.error("Eroare la încărcare companii:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSend = async () => {
    if (!subject || !message) {
      toast({
        title: "Eroare",
        description: "Te rog completează subiectul și mesajul",
        variant: "destructive",
      });
      return;
    }

    if (selectedCompanies.length === 0) {
      toast({
        title: "Eroare",
        description: "Te rog selectează cel puțin o companie din tab-ul Clienți",
        variant: "destructive",
      });
      return;
    }

    if (scheduleMode === "later" && !scheduledDate) {
      toast({
        title: "Eroare",
        description: "Te rog alege data pentru programare",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      if (scheduleMode === "now") {
        // Trimite imediat
        const { data: broadcastData, error: broadcastError } = await supabase
          .from("email_broadcasts")
          .insert([{
            subject,
            message,
            filter_criteria: null,
            created_by: user.id,
            status: 'pending',
          }])
          .select()
          .single();

        if (broadcastError) throw broadcastError;

        // Afișează toast că procesul a început
        toast({
          title: "Se procesează...",
          description: `Se trimit emailuri către ${selectedCompanies.length} companii. Acest proces poate dura câteva momente.`,
        });

        // Invocă cu timeout de 120 secunde (2 minute)
        const invokeWithTimeout = async () => {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout - procesul durează prea mult")), 120000)
          );

          const invokePromise = supabase.functions.invoke("send-broadcast-email", {
            body: {
              subject,
              message,
              companyIds: selectedCompanies,
              broadcastId: broadcastData.id,
            },
          });

          return Promise.race([invokePromise, timeoutPromise]);
        };

        const { data, error } = await invokeWithTimeout() as any;

        if (error) throw error;

        toast({
          title: "Succes!",
          description: data.message || `Emailuri trimise către ${data.sentCount} companii`,
        });
      } else {
        // Programează pentru mai târziu
        const scheduledDateTime = new Date(
          `${format(scheduledDate!, "yyyy-MM-dd")}T${scheduledTime}:00`
        );

        const { error } = await supabase
          .from("scheduled_emails")
          .insert({
            accountant_id: user.id,
            company_ids: selectedCompanies,
            subject,
            body: message,
            send_at: scheduledDateTime.toISOString(),
            status: "scheduled",
          });

        if (error) throw error;

        toast({
          title: "Programat cu succes!",
          description: `Emailul va fi trimis pe ${format(scheduledDateTime, "PPP 'la' HH:mm", { locale: ro })} către ${selectedCompanies.length} companii`,
        });
      }

      // Resetează formularul
      setSubject("");
      setMessage("");
      setScheduleMode("now");
      setScheduledDate(undefined);
      setScheduledTime("08:00");
      clearSelection(); // Curăță selecția din context
      setUseFilters(false);
      setFilterByVAT("all");
      setFilterByTaxType("all");
      setFilterByStatus("all");
    } catch (error: any) {
      console.error("Eroare la trimitere:", error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-au putut trimite emailurile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Trimite Email Broadcast
        </h2>
        <p className="text-muted-foreground mt-1">
          Trimite un email către companiile selectate din tab-ul "Clienți"
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compune Mesajul</CardTitle>
          <CardDescription>
            Emailul va fi trimis către companiile pe care le-ai bifat în tab-ul "Clienți"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subiect *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Actualizare importantă în aplicație"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mesaj *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrie mesajul aici..."
              rows={8}
              disabled={loading}
            />
          </div>

          {/* Când să trimitem */}
          <div className="border-t pt-4">
            <Label className="mb-3 block">Când să trimitem emailul?</Label>
            <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "now" | "later")} disabled={loading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="now" id="now" />
                <Label htmlFor="now" className="font-normal cursor-pointer">Trimite imediat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="later" id="later" />
                <Label htmlFor="later" className="font-normal cursor-pointer">Programează pentru mai târziu</Label>
              </div>
            </RadioGroup>

            {scheduleMode === "later" && (
              <div className="grid grid-cols-2 gap-4 pl-6 mt-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled={loading}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP", { locale: ro }) : "Alege data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Ora</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="time" 
                      value={scheduledTime} 
                      onChange={(e) => setScheduledTime(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Companii selectate */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label>Companiile selectate din tab-ul "Clienți" ({selectedCompanies.length})</Label>
            </div>

            {selectedCompanies.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p className="font-medium">Nicio companie selectată</p>
                  <p className="text-sm mt-2">Mergi la tab-ul "Clienți" și bifează companiile cărora vrei să le trimiți email</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium mb-2">Gata de trimitere către:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCompanies.length} {selectedCompanies.length === 1 ? "companie selectată" : "companii selectate"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: Poți schimba selecția în tab-ul "Clienți"
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || !subject || !message || selectedCompanies.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Trimite Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notă Importantă</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Emailurile vor fi trimise doar către companiile bifate în tab-ul "Clienți"
          </p>
          <p>
            • Selecțiile tale rămân salvate chiar dacă navighezi între pagini
          </p>
          <p>
            • Emailurile programate vor fi trimise automat la data și ora stabilite
          </p>
          <p>
            • Verifică cu atenție mesajul înainte de trimitere - nu se poate anula după trimitere
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
