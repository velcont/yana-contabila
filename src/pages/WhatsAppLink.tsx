import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageCircle, CheckCircle2, Loader2, Phone, RefreshCw } from "lucide-react";

type Step = "phone" | "code" | "linked";

interface LinkRow {
  phone_e164: string;
  verified: boolean;
  verified_at: string | null;
  last_message_at: string | null;
}

export default function WhatsAppLink() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+40");
  const [code, setCode] = useState("");
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setBootLoading(false); return; }
      const { data } = await (supabase as any)
        .from("wa_user_links")
        .select("phone_e164, verified, verified_at, last_message_at")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        setLink(data);
        setPhone(data.phone_e164);
        if (data.verified) setStep("linked");
      }
      setBootLoading(false);
    })();
  }, []);

  const sendCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-link-init", { body: { phone } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Cod trimis", description: "Verifică WhatsApp pentru codul de 6 cifre." });
      setStep("code");
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message ?? "Nu am putut trimite codul", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-link-verify", { body: { code } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Conectat ✅", description: "WhatsApp-ul tău e legat de Yana." });
      setStep("linked");
      setLink({ phone_e164: phone, verified: true, verified_at: new Date().toISOString(), last_message_at: null });
    } catch (e: any) {
      toast({ title: "Cod invalid", description: e.message ?? "Verifică codul", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await (supabase as any).from("wa_user_links").delete().eq("user_id", u.user.id);
    setLink(null);
    setCode("");
    setStep("phone");
    toast({ title: "Deconectat", description: "WhatsApp-ul nu mai e legat de Yana." });
  };

  if (bootLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/yana"><Button variant="ghost" size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" />Înapoi</Button></Link>
          <h1 className="text-base font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp ↔ Yana</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              Vorbește cu Yana pe WhatsApp
            </CardTitle>
            <CardDescription>
              Conectează-ți numărul și vei putea scrie Yanei direct pe WhatsApp, oriunde ești.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "phone" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Numărul tău de WhatsApp</label>
                  <Input
                    type="tel"
                    placeholder="+40712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                  />
                  <p className="text-xs text-muted-foreground">Format internațional cu prefix de țară (ex. +40 pentru România).</p>
                </div>
                <Button onClick={sendCode} disabled={loading || phone.length < 8} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                  Trimite cod pe WhatsApp
                </Button>
              </>
            )}

            {step === "code" && (
              <>
                <div className="space-y-3">
                  <p className="text-sm">
                    Am trimis un cod de 6 cifre pe <strong>{phone}</strong>.
                    Introdu-l mai jos:
                  </p>
                  <div className="flex justify-center py-2">
                    <InputOTP maxLength={6} value={code} onChange={setCode}>
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("phone")} disabled={loading} className="flex-1">
                    Înapoi
                  </Button>
                  <Button onClick={verify} disabled={loading || code.length !== 6} className="flex-1">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Verifică
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={sendCode} disabled={loading} className="w-full">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retrimite codul
                </Button>
              </>
            )}

            {step === "linked" && link && (
              <>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Conectat cu succes ✅</p>
                    <p className="text-muted-foreground">
                      Numărul <strong>{link.phone_e164}</strong> e legat de contul tău. Scrie-i Yanei un mesaj pe WhatsApp și îți va răspunde.
                    </p>
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <p>💡 <strong>Cum funcționează:</strong></p>
                  <p>1. Salvează numărul Yanei în agendă (cel pe care ai primit codul).</p>
                  <p>2. Scrie-i orice — întrebări, idei, urgențe.</p>
                  <p>3. Pentru analize complexe (balanțe, rapoarte), folosește aplicația.</p>
                </div>
                <Button variant="outline" onClick={disconnect} className="w-full">
                  Deconectează numărul
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
