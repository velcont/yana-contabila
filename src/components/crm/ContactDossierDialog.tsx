import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Trash2, Pin, PinOff, Plus, FileText, Briefcase, Heart, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface DossierContact {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
  birthday?: string | null;
  fiscal_params?: Record<string, any> | null;
  personal_info?: Record<string, any> | null;
  crm_companies?: { name: string } | null;
}

interface ContactNote {
  id: string;
  category: string;
  title?: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "general", label: "General", icon: FileText },
  { value: "discutie", label: "Discuție", icon: MessageSquare },
  { value: "intalnire", label: "Întâlnire", icon: MessageSquare },
  { value: "telefon", label: "Telefon", icon: MessageSquare },
  { value: "email", label: "Email", icon: MessageSquare },
  { value: "fiscal", label: "Fiscal", icon: Briefcase },
  { value: "privat", label: "Privat", icon: Heart },
];

interface Props {
  contact: DossierContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ContactDossierDialog({ contact, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<ContactNote[]>([]);

  // Editable fields
  const [birthday, setBirthday] = useState("");
  const [fiscal, setFiscal] = useState<Record<string, string>>({});
  const [personal, setPersonal] = useState<Record<string, string>>({});

  // New note form
  const [newNoteCategory, setNewNoteCategory] = useState("discutie");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!contact || !open) return;
    setBirthday(contact.birthday || "");
    setFiscal({
      cnp: contact.fiscal_params?.cnp || "",
      cui_personal: contact.fiscal_params?.cui_personal || "",
      tip_impozit: contact.fiscal_params?.tip_impozit || "",
      tva: contact.fiscal_params?.tva || "",
      regim_tva: contact.fiscal_params?.regim_tva || "",
      plata_tva: contact.fiscal_params?.plata_tva || "",
      cod_caen: contact.fiscal_params?.cod_caen || "",
      casa_marcat: contact.fiscal_params?.casa_marcat || "",
      cont_bancar: contact.fiscal_params?.cont_bancar || "",
      banca: contact.fiscal_params?.banca || "",
      observatii_fiscale: contact.fiscal_params?.observatii_fiscale || "",
    });
    setPersonal({
      stare_civila: contact.personal_info?.stare_civila || "",
      sot_sotie: contact.personal_info?.sot_sotie || "",
      copii: contact.personal_info?.copii || "",
      hobby: contact.personal_info?.hobby || "",
      preferinte: contact.personal_info?.preferinte || "",
      alergii: contact.personal_info?.alergii || "",
      evenimente: contact.personal_info?.evenimente || "",
      observatii_personale: contact.personal_info?.observatii_personale || "",
    });
    loadNotes();
  }, [contact, open]);

  async function loadNotes() {
    if (!contact) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_contact_notes")
      .select("*")
      .eq("contact_id", contact.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Nu am putut încărca notele");
    } else {
      setNotes((data || []) as ContactNote[]);
    }
    setLoading(false);
  }

  async function saveDossier() {
    if (!contact) return;
    setSaving(true);
    const { error } = await supabase
      .from("crm_contacts")
      .update({
        birthday: birthday || null,
        fiscal_params: fiscal,
        personal_info: personal,
      })
      .eq("id", contact.id);
    setSaving(false);
    if (error) {
      toast.error("Eroare la salvare: " + error.message);
    } else {
      toast.success("Dosar salvat");
      onSaved?.();
    }
  }

  async function addNote() {
    if (!contact || !newNoteContent.trim()) return;
    setAddingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Nu ești autentificat");
      setAddingNote(false);
      return;
    }
    const { error } = await supabase.from("crm_contact_notes").insert({
      user_id: user.id,
      contact_id: contact.id,
      category: newNoteCategory,
      title: newNoteTitle || null,
      content: newNoteContent.trim(),
    });
    setAddingNote(false);
    if (error) {
      toast.error("Eroare la adăugare notă");
    } else {
      toast.success("Notă adăugată");
      setNewNoteTitle("");
      setNewNoteContent("");
      loadNotes();
    }
  }

  async function togglePin(note: ContactNote) {
    await supabase.from("crm_contact_notes").update({ is_pinned: !note.is_pinned }).eq("id", note.id);
    loadNotes();
  }

  async function deleteNote(note: ContactNote) {
    if (!confirm("Ștergi această notă?")) return;
    await supabase.from("crm_contact_notes").delete().eq("id", note.id);
    toast.success("Notă ștearsă");
    loadNotes();
  }

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📁 Dosar — {contact.first_name} {contact.last_name}
          </DialogTitle>
          <DialogDescription>
            {contact.job_title && <span>{contact.job_title}</span>}
            {contact.crm_companies?.name && <span> • {contact.crm_companies.name}</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
            <TabsTrigger value="privat">Privat</TabsTrigger>
            <TabsTrigger value="notes">Note ({notes.length})</TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={contact.email || "—"} />
              <Field label="Telefon" value={contact.phone || "—"} />
              <Field label="Funcție" value={contact.job_title || "—"} />
              <Field label="LinkedIn" value={contact.linkedin_url || "—"} />
            </div>
            <div>
              <Label>Data nașterii</Label>
              <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            {contact.notes && (
              <div>
                <Label>Note generale (din contact)</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted/30 rounded">{contact.notes}</p>
              </div>
            )}
          </TabsContent>

          {/* FISCAL */}
          <TabsContent value="fiscal" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Parametri fiscali ai contactului (PFA, SRL personal, etc.)</p>
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="CNP" value={fiscal.cnp} onChange={(v) => setFiscal({ ...fiscal, cnp: v })} maxLength={13} />
              <FieldInput label="CUI personal (PFA/SRL)" value={fiscal.cui_personal} onChange={(v) => setFiscal({ ...fiscal, cui_personal: v })} />
              <div>
                <Label>Tip impozit</Label>
                <Select value={fiscal.tip_impozit || undefined} onValueChange={(v) => setFiscal({ ...fiscal, tip_impozit: v })}>
                  <SelectTrigger><SelectValue placeholder="Alege..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro (1%/3%)</SelectItem>
                    <SelectItem value="profit">Impozit pe profit (16%)</SelectItem>
                    <SelectItem value="venit">Impozit pe venit</SelectItem>
                    <SelectItem value="pfa_real">PFA - sistem real</SelectItem>
                    <SelectItem value="pfa_norma">PFA - normă de venit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plătitor TVA</Label>
                <Select value={fiscal.tva || undefined} onValueChange={(v) => setFiscal({ ...fiscal, tva: v })}>
                  <SelectTrigger><SelectValue placeholder="Alege..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="da">Da</SelectItem>
                    <SelectItem value="nu">Nu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Regim TVA</Label>
                <Select value={fiscal.regim_tva || undefined} onValueChange={(v) => setFiscal({ ...fiscal, regim_tva: v })}>
                  <SelectTrigger><SelectValue placeholder="Alege..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="incasare">La încasare</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plată TVA</Label>
                <Select value={fiscal.plata_tva || undefined} onValueChange={(v) => setFiscal({ ...fiscal, plata_tva: v })}>
                  <SelectTrigger><SelectValue placeholder="Alege..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunar">Lunar</SelectItem>
                    <SelectItem value="trimestrial">Trimestrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FieldInput label="Cod CAEN" value={fiscal.cod_caen} onChange={(v) => setFiscal({ ...fiscal, cod_caen: v })} />
              <FieldInput label="Casă de marcat" value={fiscal.casa_marcat} onChange={(v) => setFiscal({ ...fiscal, casa_marcat: v })} placeholder="Da/Nu/Serie" />
              <FieldInput label="Bancă" value={fiscal.banca} onChange={(v) => setFiscal({ ...fiscal, banca: v })} />
              <FieldInput label="Cont bancar (IBAN)" value={fiscal.cont_bancar} onChange={(v) => setFiscal({ ...fiscal, cont_bancar: v })} />
            </div>
            <div>
              <Label>Observații fiscale</Label>
              <Textarea rows={3} value={fiscal.observatii_fiscale} onChange={(e) => setFiscal({ ...fiscal, observatii_fiscale: e.target.value })} />
            </div>
          </TabsContent>

          {/* PRIVAT */}
          <TabsContent value="privat" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Informații personale — folosite pentru a întări relația. Vizibile doar ție.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stare civilă</Label>
                <Select value={personal.stare_civila || undefined} onValueChange={(v) => setPersonal({ ...personal, stare_civila: v })}>
                  <SelectTrigger><SelectValue placeholder="Alege..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="necasatorit">Necăsătorit(ă)</SelectItem>
                    <SelectItem value="casatorit">Căsătorit(ă)</SelectItem>
                    <SelectItem value="divortat">Divorțat(ă)</SelectItem>
                    <SelectItem value="vaduv">Văduv(ă)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FieldInput label="Soț/Soție" value={personal.sot_sotie} onChange={(v) => setPersonal({ ...personal, sot_sotie: v })} />
              <FieldInput label="Copii" value={personal.copii} onChange={(v) => setPersonal({ ...personal, copii: v })} placeholder="ex: 2 (Maria 8 ani, Ion 5 ani)" />
              <FieldInput label="Hobby" value={personal.hobby} onChange={(v) => setPersonal({ ...personal, hobby: v })} />
            </div>
            <div>
              <Label>Preferințe (cafea, mâncare, locuri)</Label>
              <Textarea rows={2} value={personal.preferinte} onChange={(e) => setPersonal({ ...personal, preferinte: e.target.value })} />
            </div>
            <div>
              <Label>Alergii / restricții</Label>
              <Input value={personal.alergii} onChange={(e) => setPersonal({ ...personal, alergii: e.target.value })} />
            </div>
            <div>
              <Label>Evenimente importante</Label>
              <Textarea rows={2} value={personal.evenimente} onChange={(e) => setPersonal({ ...personal, evenimente: e.target.value })} placeholder="aniversări, sărbători, momente personale..." />
            </div>
            <div>
              <Label>Alte observații personale</Label>
              <Textarea rows={3} value={personal.observatii_personale} onChange={(e) => setPersonal({ ...personal, observatii_personale: e.target.value })} />
            </div>
          </TabsContent>

          {/* NOTES */}
          <TabsContent value="notes" className="space-y-3 mt-4">
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Adaugă notă nouă</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newNoteCategory} onValueChange={setNewNoteCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Titlu (opțional)" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} />
                </div>
                <Textarea
                  rows={3}
                  placeholder="Ce ați discutat? Decizii, follow-up, observații..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                />
                <Button size="sm" onClick={addNote} disabled={addingNote || !newNoteContent.trim()} className="gap-2">
                  {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Salvează nota
                </Button>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nicio notă încă. Adaugă prima.</p>
            ) : (
              notes.map((n) => (
                <Card key={n.id} className={n.is_pinned ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px]">{CATEGORIES.find((c) => c.value === n.category)?.label || n.category}</Badge>
                        {n.title && <span className="font-semibold text-sm truncate">{n.title}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePin(n)}>
                          {n.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNote(n)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("ro-RO")}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Închide</Button>
          <Button onClick={saveDossier} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvează dosar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </div>
  );
}