import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, Trash2, File, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
}

export const StorageManager = () => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      // Query all objects in the bucket (includes nested paths like user_id/filename)
      const { data, error } = await (supabase as any)
        .from('storage.objects')
        .select('id, name, created_at, metadata')
        .eq('bucket_id', 'balance-attachments')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error as any;
      setFiles((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-au putut încărca fișierele',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("balance-attachments")
        .download(fileName);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Succes",
        description: "Fișierul a fost descărcat",
      });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut descărca fișierul",
        variant: "destructive",
      });
    }
  };

  const deleteFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("balance-attachments")
        .remove([fileName]);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Fișierul a fost șters",
      });

      fetchFiles();
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut șterge fișierul",
        variant: "destructive",
      });
    } finally {
      setDeleteFileId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const totalSize = files.reduce((acc, file) => acc + (Number(file.metadata?.size) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <HardDrive className="h-8 w-8" />
            Fișiere Stocate
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestionează balanțele încărcate în storage
          </p>
        </div>
        <Button onClick={fetchFiles} variant="outline">
          Reîmprospătează
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistici Storage</CardTitle>
          <CardDescription>
            Total fișiere: {files.length} | Spațiu utilizat: {formatFileSize(totalSize)}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista Fișiere</CardTitle>
          <CardDescription>
            Toate balanțele încărcate de utilizatori
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nu există fișiere în storage
                </div>
              ) : (
                files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <File className="h-5 w-5 text-muted-foreground mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>
                                {formatFileSize(file.metadata?.size || 0)}
                              </span>
                              <span>
                                {format(
                                  new Date(file.created_at),
                                  "dd MMM yyyy, HH:mm",
                                  { locale: ro }
                                )}
                              </span>
                              {file.metadata?.mimetype && (
                                <span className="truncate">
                                  {file.metadata.mimetype}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadFile(file.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteFileId(file.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmă ștergerea</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi acest fișier? Această acțiune nu poate fi
              anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFileId && deleteFile(deleteFileId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};