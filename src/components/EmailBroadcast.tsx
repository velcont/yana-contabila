import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Mail, Send, Loader2 } from "lucide-react";

export const EmailBroadcast = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [useFilters, setUseFilters] = useState(false);
  const [filterVat, setFilterVat] = useState<boolean | undefined>(undefined);
  const [filterTaxType, setFilterTaxType] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!subject || !message) {
      toast({
        title: "Eroare",
        description: "Te rog completează subiectul și mesajul",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Salvează broadcast-ul în baza de date
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const filterCriteria = useFilters ? {
        vatPayer: filterVat,
        taxType: filterTaxType,
      } : null;

      const hasFilters = useFilters && (filterVat !== undefined || filterTaxType !== undefined);

      const { data: broadcastData, error: broadcastError } = await supabase
        .from("email_broadcasts")
        .insert([{
          subject,
          message,
          filter_criteria: hasFilters ? filterCriteria : null,
          created_by: user.id,
          status: 'pending',
        }])
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      // Trimite emailurile prin edge function
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: {
          subject,
          message,
          filterCriteria: useFilters ? {
            vatPayer: filterVat,
            taxType: filterTaxType,
          } : undefined,
          broadcastId: broadcastData.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Succes!",
        description: data.message || `Emailuri trimise către ${data.sentCount} utilizatori`,
      });

      // Resetează formularul
      setSubject("");
      setMessage("");
      setUseFilters(false);
      setFilterVat(undefined);
      setFilterTaxType(undefined);
    } catch (error: any) {
      console.error("Eroare la trimitere broadcast:", error);
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

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="use-filters"
                checked={useFilters}
                onCheckedChange={setUseFilters}
                disabled={loading}
              />
              <Label htmlFor="use-filters">Aplică filtre pentru destinatari</Label>
            </div>

            {useFilters && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <div className="space-y-2">
                  <Label>Plătitor TVA</Label>
                  <Select
                    value={filterVat === undefined ? "all" : filterVat.toString()}
                    onValueChange={(value) =>
                      setFilterVat(value === "all" ? undefined : value === "true")
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți</SelectItem>
                      <SelectItem value="true">Da</SelectItem>
                      <SelectItem value="false">Nu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tip Impozitare</Label>
                  <Select
                    value={filterTaxType || "all"}
                    onValueChange={(value) =>
                      setFilterTaxType(value === "all" ? undefined : value)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      <SelectItem value="micro">Microîntreprindere</SelectItem>
                      <SelectItem value="profit">Impozit pe Profit</SelectItem>
                      <SelectItem value="dividend">Dividend</SelectItem>
                      <SelectItem value="norma_venit">Normă de Venit</SelectItem>
                    </SelectContent>
                  </Select>
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
            • Emailurile vor fi trimise către toți utilizatorii înregistrați în aplicație
          </p>
          <p>
            • Dacă aplici filtre, doar utilizatorii care au firme cu caracteristicile
            selectate vor primi emailul
          </p>
          <p>
            • Verifică cu atenție mesajul înainte de trimitere - nu se poate anula după ce
            emailurile sunt trimise
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
