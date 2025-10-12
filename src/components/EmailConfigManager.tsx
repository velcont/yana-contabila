import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const EmailConfigManager = () => {
  const [loading, setLoading] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email_provider: "google",
    from_name: "",
    from_email: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("email_config")
        .select("*")
        .eq("accountant_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setHasConfig(true);
        setFormData({
          email_provider: data.email_provider,
          from_name: data.from_name || "",
          from_email: data.from_email,
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || "",
          smtp_password: "", // Nu afișăm parola
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.from_email || !formData.smtp_user) {
      toast({
        title: "Eroare",
        description: "Completează toate câmpurile obligatorii",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      const configData = {
        accountant_id: user.id,
        email_provider: formData.email_provider,
        from_name: formData.from_name,
        from_email: formData.from_email,
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_password_encrypted: formData.smtp_password, // În producție ar trebui criptat
        is_active: true,
      };

      if (hasConfig) {
        const { error } = await supabase
          .from("email_config")
          .update(configData)
          .eq("accountant_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_config")
          .insert([configData]);

        if (error) throw error;
        setHasConfig(true);
      }

      toast({ title: "Configurare salvată cu succes!" });
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

  const updateSMTPDefaults = (provider: string) => {
    const defaults: Record<string, { host: string; port: number }> = {
      google: { host: "smtp.gmail.com", port: 587 },
      outlook: { host: "smtp-mail.outlook.com", port: 587 },
      yahoo: { host: "smtp.mail.yahoo.com", port: 587 },
    };

    if (defaults[provider]) {
      setFormData({
        ...formData,
        email_provider: provider,
        smtp_host: defaults[provider].host,
        smtp_port: defaults[provider].port,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurare Cont Email</CardTitle>
        <CardDescription>
          Configurează contul de email pentru a trimite mesaje către clienți
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Pentru Gmail, trebuie să folosești o "parolă de aplicație" (App Password), 
            nu parola ta obișnuită. Accesează{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google App Passwords
            </a>{" "}
            pentru a genera una.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Furnizor Email</Label>
            <Select
              value={formData.email_provider}
              onValueChange={updateSMTPDefaults}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google (Gmail)</SelectItem>
                <SelectItem value="outlook">Microsoft (Outlook)</SelectItem>
                <SelectItem value="yahoo">Yahoo</SelectItem>
                <SelectItem value="custom">Personalizat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nume Expeditor</Label>
              <Input
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                placeholder="ex: Cabinet Contabil XYZ"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Expeditor *</Label>
              <Input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                placeholder="ex: contabilitate@firma.ro"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Server SMTP</Label>
              <Input
                value={formData.smtp_host}
                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                placeholder="ex: smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port SMTP</Label>
              <Input
                type="number"
                value={formData.smtp_port}
                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Utilizator SMTP (Email) *</Label>
            <Input
              type="email"
              value={formData.smtp_user}
              onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
              placeholder="ex: your-email@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Parolă SMTP (App Password pentru Gmail) *</Label>
            <Input
              type="password"
              value={formData.smtp_password}
              onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
              placeholder="Parola de aplicație sau parola email"
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? (
              "Se salvează..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvează Configurarea
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};