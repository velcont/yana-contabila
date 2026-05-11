import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Search, Upload, Sparkles, Plus, Phone, Smartphone, Lock, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface NewCompany {
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
}

interface Batch {
  id: string;
  file_name: string;
  period_start: string | null;
  period_end: string | null;
  inserted_rows: number | null;
}

const PAGE_SIZE = 50;

export default function FirmeNoi() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accessType, loading: subLoading } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string>("all");
  const [companies, setCompanies] = useState<NewCompany[]>([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [judet, setJudet] = useState<string>("all");
  const [judete, setJudete] = useState<string[]>([]);
  const [onlyPhone, setOnlyPhone] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; company?: NewCompany; subject?: string; body?: string; loading?: boolean }>({ open: false });

  const hasAccess = useMemo(
    () => isAdmin || accessType === "free_access" || accessType === "trial" || accessType === "subscription",
    [isAdmin, accessType],
  );

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!hasAccess) return;
    supabase.from("new_companies_batches").select("id, file_name, period_start, period_end, inserted_rows")
      .order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setBatches((data as Batch[]) ?? []));
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    supabase.from("new_companies").select("judet").not("judet", "is", null).limit(2000)
      .then(({ data }) => {
        const uniq = Array.from(new Set((data ?? []).map((r: any) => r.judet))).sort();
        setJudete(uniq);
      });
  }, [hasAccess]);

  const load = async () => {
    if (!hasAccess) return;
    setLoading(true);
    let q = supabase.from("new_companies")
      .select("id, cui, nume, judet, localitate, telefon, mobil, caen, descriere_caen, data_infiintarii", { count: "exact" })
      .order("data_infiintarii", { ascending: false, nullsFirst: false });

    if (batchId !== "all") q = q.eq("batch_id", batchId);
    if (judet !== "all") q = q.eq("judet", judet);
    if (onlyPhone) q = q.or("telefon.not.is.null,mobil.not.is.null");
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`nume.ilike.%${s}%,cui.ilike.%${s}%,caen.ilike.%${s}%`);
    }
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, error, count: c } = await q;
    if (error) toast.error(error.message);
    else { setCompanies((data as NewCompany[]) ?? []); setCount(c ?? 0); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hasAccess, batchId, judet, onlyPhone, page]);
  useEffect(() => { setPage(0); }, [batchId, judet, onlyPhone, search]);

  const handleUpload = async (file: File) => {
    if (!isAdmin) return;
    setUploading(true);
    try {
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("firme-noi-uploads").upload(path, file, {
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (upErr) throw upErr;
      const { data, error } = await supabase.functions.invoke("import-new-companies", { body: { file_path: path } });
      if (error) throw error;
      toast.success(`Importate ${data.inserted}/${data.total} firme`);
      // refresh
      const { data: bs } = await supabase.from("new_companies_batches").select("id, file_name, period_start, period_end, inserted_rows").order("created_at", { ascending: false }).limit(8);
      setBatches((bs as Batch[]) ?? []);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Eroare upload");
    } finally {
      setUploading(false);
    }
  };

  const generateEmail = async (c: NewCompany) => {
    setEmailDialog({ open: true, company: c, loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("generate-prospect-email", { body: { new_company_id: c.id } });
      if (error) throw error;
      setEmailDialog({ open: true, company: c, subject: data.subject, body: data.body, loading: false });
    } catch (e: any) {
      toast.error(e?.message ?? "Eroare la generare");
      setEmailDialog({ open: false });
    }
  };

  const addToCRM = async (c: NewCompany) => {
    if (!user) return;
    try {
      await supabase.rpc("ensure_default_crm_pipeline", { p_user_id: user.id });
      const { data: pipeline } = await supabase.from("crm_pipelines").select("id").eq("user_id", user.id).eq("is_default", true).single();
      const { data: stage } = await supabase.from("crm_pipeline_stages").select("id").eq("pipeline_id", pipeline!.id).order("display_order").limit(1).single();

      const { data: comp, error: ce } = await supabase.from("crm_companies").insert({
        user_id: user.id,
        name: c.nume,
        cui: c.cui,
        phone: c.telefon ?? c.mobil,
        city: c.localitate,
        address: c.judet,
        industry: c.descriere_caen,
        metadata: { source: "firme_noi", new_company_id: c.id, caen: c.caen, judet: c.judet },
      }).select().single();
      if (ce) throw ce;

      const { data: deal, error: de } = await supabase.from("crm_deals").insert({
        user_id: user.id,
        pipeline_id: pipeline!.id,
        stage_id: stage!.id,
        company_id: comp.id,
        title: `Lead: ${c.nume}`,
      }).select().single();
      if (de) throw de;

      await supabase.from("new_company_outreach").upsert({
        user_id: user.id,
        new_company_id: c.id,
        status: "added_to_crm",
        crm_company_id: comp.id,
        crm_deal_id: deal.id,
      }, { onConflict: "user_id,new_company_id" });

      toast.success("Adăugat în CRM", { action: { label: "Vezi CRM", onClick: () => navigate("/crm") } });
    } catch (e: any) {
      toast.error(e?.message ?? "Eroare CRM");
    }
  };

  if (subLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Firme nou înființate</h1>
          <p className="text-muted-foreground">
            Lista cu firmele nou înființate săptămânal (4000+) este disponibilă pentru abonații YANA Strategic
            și pentru utilizatorii în perioada de probă.
          </p>
          <Button onClick={() => navigate("/pricing")}>Activează YANA Strategic</Button>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-4 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Firme nou înființate</h1>
          <p className="text-sm text-muted-foreground">{count.toLocaleString()} firme · vizualizare protejată, fără export</p>
        </div>
        {isAdmin && (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <Button asChild disabled={uploading}><span>{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Încarcă fișier</span></Button>
          </label>
        )}
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Caută nume / CUI / CAEN" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Toate săptămânile" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate săptămânile</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.period_start ?? b.file_name.slice(0, 30)} {b.period_end ? `→ ${b.period_end}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={judet} onValueChange={setJudet}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Județ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate județele</SelectItem>
            {judete.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={onlyPhone ? "default" : "outline"} size="sm" onClick={() => setOnlyPhone(v => !v)}>
          <Phone className="w-3 h-3 mr-1" /> Cu telefon
        </Button>
        <Button variant="outline" size="sm" onClick={load}>Aplică</Button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : companies.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nicio firmă găsită cu filtrele selectate.</Card>
      ) : (
        <div className="grid gap-3" onContextMenu={(e) => e.preventDefault()}>
          {companies.map((c) => (
            <Card key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{c.nume}</h3>
                  <Badge variant="outline">CUI {c.cui}</Badge>
                  {c.data_infiintarii && <Badge variant="secondary">{c.data_infiintarii}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {c.judet ? `${c.judet}` : ""}{c.localitate ? ` · ${c.localitate}` : ""}
                  {c.caen && <> · CAEN {c.caen} {c.descriere_caen ? `— ${c.descriere_caen}` : ""}</>}
                </div>
                <div className="flex gap-3 mt-2 text-sm">
                  {c.telefon && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefon}</span>}
                  {c.mobil && <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{c.mobil}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => generateEmail(c)}>
                  <Sparkles className="w-3 h-3 mr-1" /> Ofertă
                </Button>
                <Button size="sm" onClick={() => addToCRM(c)}>
                  <Plus className="w-3 h-3 mr-1" /> CRM
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
          <span className="text-sm text-muted-foreground">Pagina {page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Următor →</Button>
        </div>
      )}

      <Dialog open={emailDialog.open} onOpenChange={(o) => !o && setEmailDialog({ open: false })}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ofertă pentru {emailDialog.company?.nume}</DialogTitle>
          </DialogHeader>
          {emailDialog.loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Subiect</label>
                <Input value={emailDialog.subject ?? ""} onChange={(e) => setEmailDialog(d => ({ ...d, subject: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mesaj</label>
                <Textarea rows={10} value={emailDialog.body ?? ""} onChange={(e) => setEmailDialog(d => ({ ...d, body: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(`Subiect: ${emailDialog.subject}\n\n${emailDialog.body}`);
              toast.success("Copiat în clipboard");
            }}>
              <Copy className="w-4 h-4 mr-2" /> Copiază
            </Button>
            <Button onClick={async () => {
              if (!user || !emailDialog.company) return;
              await supabase.from("new_company_outreach").upsert({
                user_id: user.id,
                new_company_id: emailDialog.company.id,
                status: "copied",
                email_subject: emailDialog.subject,
                email_body: emailDialog.body,
              }, { onConflict: "user_id,new_company_id" });
              toast.success("Marcat ca trimis");
              setEmailDialog({ open: false });
            }}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Marchează trimis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}