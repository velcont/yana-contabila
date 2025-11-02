import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Download, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClientDocument {
  id: string;
  company_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  period: string;
  notes: string;
  created_at: string;
  file_size: number;
  companies: { company_name: string };
}

export const ClientDocumentsManager = () => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    company_id: "",
    document_name: "",
    document_type: "balanta",
    period: "",
    notes: "",
  });

  useEffect(() => {
    fetchDocuments();
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("managed_by_accountant_id", user.id);
    
    setCompanies(data || []);
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("client_documents")
        .select("*, companies(company_name)")
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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

  const handleUpload = async () => {
    if (!uploadFile || !formData.company_id || !formData.document_name) {
      toast({
        title: "Eroare",
        description: "Completează toate câmpurile obligatorii",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}_${formData.document_name}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("legal-documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Save document metadata
      const { error: insertError } = await supabase
        .from("client_documents")
        .insert([{
          company_id: formData.company_id,
          document_name: formData.document_name,
          document_type: formData.document_type,
          file_path: filePath,
          period: formData.period || null,
          notes: formData.notes || null,
          uploaded_by: user.id,
          file_size: uploadFile.size,
        }]);

      if (insertError) throw insertError;

      toast({ title: "Document încărcat cu succes!" });
      setUploadDialogOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm("Sigur vrei să ștergi acest document?")) return;

    try {
      // Delete from storage
      await supabase.storage.from("legal-documents").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("client_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Document șters cu succes!" });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: "",
      document_name: "",
      document_type: "balanta",
      period: "",
      notes: "",
    });
    setUploadFile(null);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.companies.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === "all" || doc.company_id === selectedCompany;
    return matchesSearch && matchesCompany;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Documente Clienți
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestionează documentele financiar-contabile
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Încarcă Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Încarcă Document Nou</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
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
                <Label>Nume Document *</Label>
                <Input
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  placeholder="ex: Balanța Ianuarie 2025"
                />
              </div>

              <div className="space-y-2">
                <Label>Tip Document</Label>
                <Select value={formData.document_type} onValueChange={(value) => setFormData({ ...formData, document_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanta">Balanță</SelectItem>
                    <SelectItem value="bilanț">Bilanț</SelectItem>
                    <SelectItem value="declaratie">Declarație Fiscală</SelectItem>
                    <SelectItem value="factura">Factură</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="altele">Altele</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Perioadă</Label>
                <Input
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  placeholder="ex: 01/2025"
                />
              </div>

              <div className="space-y-2">
                <Label>Fișier *</Label>
                <Input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.xlsx,.xls,.doc,.docx"
                />
              </div>

              <div className="space-y-2">
                <Label>Notițe</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Anulează
              </Button>
              <Button onClick={handleUpload}>Încarcă</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută documente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toți clienții</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Niciun document găsit
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Perioadă</TableHead>
                    <TableHead>Mărime</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.document_name}</TableCell>
                    <TableCell>{doc.companies.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>{doc.period || "-"}</TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" title="Descarcă">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        title="Șterge"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};