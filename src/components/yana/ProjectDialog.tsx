import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, Upload, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Company { id: string; company_name: string; cui: string | null; }
interface ProjectFile { id: string; file_name: string; storage_path: string; size_bytes: number | null; }

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null; // null = create new
  onSaved?: (projectId: string) => void;
}

export function ProjectDialog({ open, onOpenChange, projectId, onSaved }: ProjectDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [companyId, setCompanyId] = useState<string>('none');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(projectId);

  useEffect(() => { setCurrentId(projectId); }, [projectId]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: comps } = await supabase
        .from('companies')
        .select('id, company_name, cui')
        .or(`user_id.eq.${user.id},managed_by_accountant_id.eq.${user.id}`)
        .order('company_name');
      setCompanies(comps || []);

      if (currentId) {
        const { data: p } = await supabase.from('yana_projects').select('*').eq('id', currentId).single();
        if (p) {
          setName(p.name);
          setDescription(p.description || '');
          setInstructions(p.instructions || '');
          setCompanyId(p.company_id || 'none');
        }
        const { data: fs } = await supabase
          .from('yana_project_files')
          .select('id, file_name, storage_path, size_bytes')
          .eq('project_id', currentId)
          .order('created_at', { ascending: false });
        setFiles(fs || []);
      } else {
        setName(''); setDescription(''); setInstructions(''); setCompanyId('none'); setFiles([]);
      }
    })();
  }, [open, currentId, user]);

  const handleSave = async () => {
    if (!user || !name.trim()) { toast.error('Numele proiectului e obligatoriu'); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        company_id: companyId === 'none' ? null : companyId,
      };
      if (currentId) {
        const { error } = await supabase.from('yana_projects').update(payload).eq('id', currentId);
        if (error) throw error;
        toast.success('Proiect actualizat');
        onSaved?.(currentId);
      } else {
        const { data, error } = await supabase.from('yana_projects').insert(payload).select('id').single();
        if (error) throw error;
        setCurrentId(data.id);
        toast.success('Proiect creat');
        onSaved?.(data.id);
      }
    } catch (e: any) {
      toast.error('Eroare: ' + e.message);
    } finally { setSaving(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !currentId) {
      toast.error('Salvează proiectul mai întâi');
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/${currentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('yana-project-files').upload(path, file);
      if (upErr) throw upErr;
      let extractedText: string | null = null;
      if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) {
        try { extractedText = await file.text(); } catch {}
      }
      const { data, error } = await supabase.from('yana_project_files').insert({
        project_id: currentId,
        user_id: user.id,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        extracted_text: extractedText,
      }).select('id, file_name, storage_path, size_bytes').single();
      if (error) throw error;
      setFiles(prev => [data, ...prev]);
      toast.success('Fișier încărcat');
    } catch (e: any) {
      toast.error('Eroare upload: ' + e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (file: ProjectFile) => {
    if (!confirm(`Ștergi "${file.file_name}"?`)) return;
    await supabase.storage.from('yana-project-files').remove([file.storage_path]);
    await supabase.from('yana_project_files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentId ? 'Editează proiect' : 'Proiect nou'}</DialogTitle>
          <DialogDescription>
            Grupează conversații, atașează fișiere de cunoștințe și asociază o firmă.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nume proiect *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: SRL Acme — strategie 2026" />
            </div>

            <div className="space-y-2">
              <Label>Descriere scurtă</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opțional" />
            </div>

            <div className="space-y-2">
              <Label>Instrucțiuni custom (system prompt)</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Ești consultantul fiscal pentru SRL Acme. Răspunde scurt și concret..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Vor fi injectate în context la fiecare conversație din acest proiect.</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Firma asociată</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Niciuna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Niciuna</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name} {c.cui ? `(${c.cui})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Fișiere de cunoștințe ({files.length})</Label>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleUpload} disabled={!currentId || uploading} />
                  <Button asChild variant="outline" size="sm" disabled={!currentId || uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                      Încarcă fișier
                    </span>
                  </Button>
                </label>
              </div>
              {!currentId && <p className="text-xs text-muted-foreground">Salvează proiectul ca să poți atașa fișiere.</p>}
              <div className="space-y-1">
                {files.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded border bg-card">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-sm">{f.file_name}</span>
                    <span className="text-xs text-muted-foreground">{f.size_bytes ? Math.round(f.size_bytes / 1024) + ' KB' : ''}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteFile(f)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Închide</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {currentId ? 'Salvează' : 'Creează proiect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
