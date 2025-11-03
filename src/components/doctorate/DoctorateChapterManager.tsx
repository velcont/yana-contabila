import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Upload
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string;
  word_count: number;
  status: string;
  version: number;
  uploaded_at: string;
  file_name: string;
  file_path: string;
  content: string;
}

export const DoctorateChapterManager = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('doctorate_chapters')
        .select('*')
        .eq('user_id', user.id)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error: any) {
      console.error("Error fetching chapters:", error);
      toast({
        title: "Eroare la încărcare",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (chapter: Chapter) => {
    try {
      const { data, error } = await supabase.storage
        .from('doctorate-documents')
        .download(chapter.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = chapter.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Descărcare completă",
        description: `${chapter.file_name}`
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Eroare la descărcare",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (chapterId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage
        .from('doctorate-documents')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('doctorate_chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;

      toast({
        title: "Capitol șters",
        description: "Capitolul a fost șters cu succes"
      });

      fetchChapters();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Eroare la ștergere",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'final':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      final: "default",
      review: "secondary",
      draft: "outline"
    };
    
    const labels: Record<string, string> = {
      final: "✅ Finalizat",
      review: "⏳ Revizuire",
      draft: "📝 Draft"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Niciun capitol încărcat</h3>
          <p className="text-sm text-muted-foreground">
            Începe prin a încărca primul capitol al doctoratului tău
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {chapters.map((chapter) => (
        <Card key={chapter.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getStatusIcon(chapter.status)}
                  Capitol {chapter.chapter_number}: {chapter.chapter_title}
                </CardTitle>
                <CardDescription className="flex items-center gap-3 flex-wrap">
                  <span>{chapter.word_count.toLocaleString()} cuvinte</span>
                  <span>•</span>
                  <span>Versiunea {chapter.version}</span>
                  <span>•</span>
                  <span>
                    {new Date(chapter.uploaded_at).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </CardDescription>
              </div>
              {getStatusBadge(chapter.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>
                      Capitol {chapter.chapter_number}: {chapter.chapter_title}
                    </DialogTitle>
                    <DialogDescription>
                      {chapter.word_count.toLocaleString()} cuvinte
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                    <div className="whitespace-pre-wrap text-sm">
                      {chapter.content.substring(0, 5000)}
                      {chapter.content.length > 5000 && "..."}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(chapter)}
              >
                <Download className="h-4 w-4 mr-2" />
                Descarcă
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Șterge
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Această acțiune va șterge permanent capitolul "{chapter.chapter_title}".
                      Această acțiune nu poate fi anulată.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anulează</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(chapter.id, chapter.file_path)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Șterge
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
