import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import mammoth from "mammoth";

interface DoctorateFileUploaderProps {
  chapterNumber: number;
  chapterTitle: string;
  expectedWordCount: string;
  onUploadComplete: () => void;
}

export const DoctorateFileUploader = ({
  chapterNumber,
  chapterTitle,
  expectedWordCount,
  onUploadComplete
}: DoctorateFileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Format invalid",
        description: "Te rog încarcă un fișier Word (.docx)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă permisă este 10MB",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(10);

      // Step 1: Extract text from Word document
      const content = await extractTextFromWord(file);
      const wordCount = countWords(content);
      setUploadProgress(30);

      // Step 2: Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      setUploadProgress(50);

      // Step 3: Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/chapter_${chapterNumber}_v1.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('doctorate-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Step 4: Insert into doctorate_chapter_files (allows multiple files)
      const { error: insertError } = await supabase
        .from('doctorate_chapter_files')
        .insert({
          user_id: user.id,
          chapter_number: chapterNumber,
          chapter_title: chapterTitle,
          file_name: file.name,
          file_path: fileName,
          content,
          word_count: wordCount,
          is_final_version: false
        });

      if (insertError) throw insertError;

      // Also update doctorate_chapters if this is the first file or marked as final
      await supabase
        .from('doctorate_chapters')
        .upsert({
          user_id: user.id,
          chapter_number: chapterNumber,
          chapter_title: chapterTitle,
          file_name: file.name,
          file_path: fileName,
          content,
          word_count: wordCount,
          status: 'draft',
          version: 1
        }, { 
          onConflict: 'user_id,chapter_number'
        });

      setUploadProgress(90);

      // Step 5: Update doctorate structure
      await updateDoctorateStructure(user.id);
      setUploadProgress(100);

      toast({
        title: "✅ Capitol încărcat cu succes!",
        description: `${chapterTitle}: ${wordCount.toLocaleString()} cuvinte`
      });

      setFile(null);
      onUploadComplete();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Eroare la încărcare",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const updateDoctorateStructure = async (userId: string) => {
    // Get all chapters
    const { data: chapters } = await supabase
      .from('doctorate_chapters')
      .select('word_count')
      .eq('user_id', userId);

    if (!chapters) return;

    const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const completionPercent = Math.round((chapters.length / 6) * 100);

    // Upsert doctorate structure
    await supabase
      .from('doctorate_structure')
      .upsert({
        user_id: userId,
        total_word_count: totalWordCount,
        completion_percent: completionPercent
      }, { onConflict: 'user_id' });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`file-${chapterNumber}`} className="text-sm font-medium">
          ➕ Încarcă Fișier Nou
        </Label>
        <Input
          id={`file-${chapterNumber}`}
          type="file"
          accept=".docx,.doc"
          onChange={handleFileSelect}
          disabled={uploading}
          className="cursor-pointer"
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1">{file.name}</span>
          <span className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-xs text-muted-foreground text-center">
            Procesare fișier... {uploadProgress}%
          </p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full"
        size="sm"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Se încarcă...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Încarcă Fișier
          </>
        )}
      </Button>
    </div>
  );
};
