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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Send, Loader2, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

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
  
  // Companii și selecție
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  // Programare
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState<string>("08:00");
  
  const { toast } = useToast();

  // Încarcă companii când se schimbă filtrele
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
      
      // Resetează selecția când se schimbă filtrele
      setSelectedCompanies([]);
    } catch (error) {
      console.error("Eroare la încărcare companii:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const selectAllCompanies = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.id));
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
        description: "Te rog selectează cel puțin o companie",
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

        const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
          body: {
            subject,
            message,
            companyIds: selectedCompanies,
            broadcastId: broadcastData.id,
          },
        });

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
      setSelectedCompanies([]);
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
          Trimite un email către toți utilizatorii sau către o categorie specifică
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compune Mesajul</CardTitle>
          <CardDescription>
            Emailul va fi trimis către toți utilizatorii care îndeplinesc criteriile selectate
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

          {/* Filtre pentru companii */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="use-filters"
                checked={useFilters}
                onCheckedChange={setUseFilters}
                disabled={loading}
              />
              <Label htmlFor="use-filters">Filtrează companiile după parametri fiscali</Label>
            </div>

            {useFilters && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Plătitor TVA</Label>
                  <Select value={filterByVAT} onValueChange={(v) => setFilterByVAT(v as any)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți</SelectItem>
                      <SelectItem value="yes">Doar cu TVA</SelectItem>
                      <SelectItem value="no">Doar fără TVA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Regim Fiscal</Label>
                  <Select value={filterByTaxType} onValueChange={(v: any) => setFilterByTaxType(v)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți</SelectItem>
                      <SelectItem value="micro">Microîntreprindere</SelectItem>
                      <SelectItem value="profit">Impozit pe profit</SelectItem>
                      <SelectItem value="dividend">Dividende</SelectItem>
                      <SelectItem value="norma_venit">Normă de venit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status Client</Label>
                  <Select value={filterByStatus} onValueChange={(v) => setFilterByStatus(v as any)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți</SelectItem>
                      <SelectItem value="active">Doar activi</SelectItem>
                      <SelectItem value="inactive">Doar inactivi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Lista cu companii și checkboxuri */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label>Selectează companiile destinatare ({selectedCompanies.length} / {companies.length})</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllCompanies}
                disabled={loading || loadingCompanies || companies.length === 0}
              >
                {selectedCompanies.length === companies.length ? "Deselectează tot" : "Selectează tot"}
              </Button>
            </div>

            {loadingCompanies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Se încarcă companiile...</span>
              </div>
            ) : companies.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Nu există companii care îndeplinesc criteriile selectate</p>
                  {useFilters && <p className="text-sm mt-2">Încearcă să modifici filtrele</p>}
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <div className="divide-y">
                  {companies.map((company) => (
                    <div key={company.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={() => toggleCompanySelection(company.id)}
                        disabled={loading}
                      />
                      <Label 
                        htmlFor={`company-${company.id}`} 
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className="font-medium">{company.company_name}</div>
                        <div className="text-xs text-muted-foreground">{company.contact_email}</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || !subject || !message}
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
            • Emailurile vor fi trimise doar către companiile selectate
          </p>
          <p>
            • Poți folosi filtrele pentru a găsi rapid companiile după criterii fiscale
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
