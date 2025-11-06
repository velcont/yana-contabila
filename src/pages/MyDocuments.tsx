import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Trash2, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GeneratedDocument {
  id: string;
  document_type: string;
  document_title: string;
  main_file_path: string;
  guide_file_path: string | null;
  bibliography_file_path: string | null;
  zip_file_path: string | null;
  word_count: number | null;
  created_at: string;
  metadata: any;
}

const MyDocuments = () => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Eroare la încărcarea documentelor");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("generated-documents")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Document descărcat cu succes!");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Eroare la descărcare");
    }
  };

  const deleteDocument = async (docId: string, paths: string[]) => {
    try {
      // Delete files from storage
      for (const path of paths) {
        if (path) {
          await supabase.storage.from("generated-documents").remove([path]);
        }
      }

      // Delete record from database
      const { error } = await supabase
        .from("generated_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      setDocuments(documents.filter((d) => d.id !== docId));
      toast.success("Document șters cu succes!");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Eroare la ștergere");
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      doctorate: "Doctorat",
      literature_review: "Literatură Review",
      conference_paper: "Conferință",
      cfo_presentation: "Prezentare CFO",
      plagiarism_report: "Raport Plagiat",
    };
    return labels[type] || type;
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      doctorate: "bg-primary/10 text-primary",
      literature_review: "bg-secondary/10 text-secondary",
      conference_paper: "bg-accent/10 text-accent",
      cfo_presentation: "bg-success/10 text-success",
      plagiarism_report: "bg-warning/10 text-warning",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.document_title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const documentTypes = Array.from(
    new Set(documents.map((d) => d.document_type))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă documentele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Biblioteca Mea de Documente</h1>
            <p className="text-muted-foreground mt-2">
              {documents.length} documente generate
            </p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Caută document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tip document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate tipurile</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getDocumentTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {filteredDocuments.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || filterType !== "all"
                ? "Niciun document găsit"
                : "Niciun document generat încă"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || filterType !== "all"
                ? "Încearcă să modifici filtrele de căutare"
                : "Generează primul tău document academic"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <Badge className={getDocumentTypeColor(doc.document_type)}>
                    {getDocumentTypeLabel(doc.document_type)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      deleteDocument(doc.id, [
                        doc.main_file_path,
                        doc.guide_file_path,
                        doc.bibliography_file_path,
                        doc.zip_file_path,
                      ].filter(Boolean) as string[])
                    }
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {doc.document_title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {new Date(doc.created_at).toLocaleDateString("ro-RO")}
                    </span>
                    {doc.word_count && <span>{doc.word_count} cuvinte</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      downloadFile(
                        doc.main_file_path,
                        `${doc.document_title}_Document.${doc.main_file_path.split('.').pop()}`
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Document Principal
                  </Button>

                  {doc.guide_file_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        downloadFile(
                          doc.guide_file_path!,
                          `${doc.document_title}_Ghid.pdf`
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Ghid Susținere
                    </Button>
                  )}

                  {doc.bibliography_file_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        downloadFile(
                          doc.bibliography_file_path!,
                          `${doc.document_title}_Bibliografie.xlsx`
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Bibliografie
                    </Button>
                  )}

                  {doc.zip_file_path && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        downloadFile(
                          doc.zip_file_path!,
                          `${doc.document_title}_PACHET_COMPLET.zip`
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Pachet Complet (ZIP)
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDocuments;
