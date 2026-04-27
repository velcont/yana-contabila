import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageCircle, Search, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Firma {
  id: string;
  cui: string;
  nume: string;
  judet: string | null;
  localitate: string | null;
  telefon: string | null;
  mobil: string | null;
  caen: string | null;
  descriere_caen: string | null;
  data_infiintarii: string | null;
  status: string;
  whatsapp_sent_at: string | null;
}

const buildMessage = (f: Firma) => {
  const numeScurt = f.nume.replace(/\s+(SRL|SA|PFA|II)\.?$/i, "").trim();
  return `Bună! Felicitări pentru ${numeScurt}! 🎉 Ai deja contabil? Avem ceva interesant pentru SRL-uri noi: contabilitate digitalizată cu AI. Detalii: yana-contabila.lovable.app`;
};

export default function FirmeNoiWhatsApp() {
  const navigate = useNavigate();
  const [firme, setFirme] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [judetFilter, setJudetFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("nou");
  const [stats, setStats] = useState({ total: 0, nou: 0, contactat: 0 });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("firme_noi_whatsapp").select("*").order("data_infiintarii", { ascending: false }).limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (judetFilter !== "all") q = q.eq("judet", judetFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message); else setFirme((data as Firma[]) || []);
    setLoading(false);

    const { data: s } = await supabase.from("firme_noi_whatsapp").select("status");
    if (s) {
      setStats({
        total: s.length,
        nou: s.filter((x: any) => x.status === "nou").length,
        contactat: s.filter((x: any) => x.status === "contactat").length,
      });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, judetFilter]);

  const filtered = useMemo(() => {
    if (!search) return firme;
    const s = search.toLowerCase();
    return firme.filter((f) => f.nume.toLowerCase().includes(s) || (f.cui && f.cui.includes(s)) || (f.localitate || "").toLowerCase().includes(s));
  }, [firme, search]);

  const judete = useMemo(() => {
    const set = new Set(firme.map((f) => f.judet).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [firme]);

  const sendWhatsApp = async (f: Firma) => {
    const phone = (f.mobil || f.telefon || "").replace(/[^\d+]/g, "");
    if (!phone) { toast.error("Fără număr de telefon"); return; }
    const msg = encodeURIComponent(buildMessage(f));
    const cleanPhone = phone.replace("+", "");
    // Folosim wa.me direct (nu api.whatsapp.com care e blocat în iframe)
    const url = `https://wa.me/${cleanPhone}?text=${msg}`;
    // window.open cu noopener evită redirectul către api.whatsapp.com
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      // Fallback: copiază linkul în clipboard dacă popup-ul e blocat
      await navigator.clipboard.writeText(url);
      toast.error("Popup blocat. Link copiat în clipboard — lipește-l într-un tab nou.");
      return;
    }

    await supabase.from("firme_noi_whatsapp").update({
      status: "contactat",
      whatsapp_sent_at: new Date().toISOString(),
    }).eq("id", f.id);
    toast.success("Marcat ca trimis");
    load();
  };

  const markStatus = async (id: string, status: string) => {
    await supabase.from("firme_noi_whatsapp").update({ status }).eq("id", id);
    toast.success("Status actualizat");
    load();
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Înapoi
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-green-600" />
          Outreach WhatsApp — Firme Noi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {stats.total} firme totale · {stats.nou} de contactat · {stats.contactat} contactate
        </p>
      </div>

      <Card className="p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Caută nume, CUI, localitate..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nou">Doar necontactate</SelectItem>
            <SelectItem value="contactat">Contactate</SelectItem>
            <SelectItem value="interesat">Interesate</SelectItem>
            <SelectItem value="respins">Respinse</SelectItem>
            <SelectItem value="all">Toate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={judetFilter} onValueChange={setJudetFilter}>
          <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Județ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate județele</SelectItem>
            {judete.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((f) => {
            const phone = f.mobil || f.telefon;
            return (
              <Card key={f.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{f.nume}</h3>
                      <Badge variant="outline" className="text-xs">CUI {f.cui}</Badge>
                      {f.status === "contactat" && <Badge className="bg-green-600 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Contactat</Badge>}
                      {f.status === "interesat" && <Badge className="bg-blue-600 text-xs">Interesat</Badge>}
                      {f.status === "respins" && <Badge variant="destructive" className="text-xs">Respins</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {f.localitate}, {f.judet} · {f.descriere_caen}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      📞 {phone || "fără telefon"} · înființată {f.data_infiintarii}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => sendWhatsApp(f)} disabled={!phone} className="bg-green-600 hover:bg-green-700">
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                    {f.status === "contactat" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => markStatus(f.id, "interesat")}>✓ Interesat</Button>
                        <Button size="sm" variant="outline" onClick={() => markStatus(f.id, "respins")}>✗ Respins</Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Nicio firmă găsită cu filtrele curente.</Card>
          )}
        </div>
      )}
    </div>
  );
}