import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StrategicDocumentUploaderProps {
  conversationId: string;
  userId: string;
  onDocumentProcessed: (text: string, fileName: string) => void;
  disabled?: boolean;
}

// Tipuri de fișiere acceptate
const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/msword': 'word',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function StrategicDocumentUploader({
  conversationId,
  userId,
  onDocumentProcessed,
  disabled = false
}: StrategicDocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validare tip fișier
    const fileType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (!fileType) {
      toast.error("Tip de fișier neacceptat. Încarcă PDF, Word, TXT sau Excel.");
      return;
    }

    // Validare dimensiune
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Fișierul este prea mare. Limita este 10MB.");
      return;
    }

    setIsUploading(true);
    setUploadedFile({ name: file.name, type: fileType });

    try {
      logger.log(`📎 [DOC-UPLOAD] Processing ${file.name} (${fileType})`);

      let extractedText = "";

      // Extrage text în funcție de tipul fișierului
      if (fileType === 'txt') {
        extractedText = await file.text();
      } else if (fileType === 'word') {
        // Folosim mammoth pentru Word (deja instalat)
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (fileType === 'pdf' || fileType === 'excel') {
        // Pentru PDF și Excel, le salvăm și trimitem la Yana cu mențiune
        // (procesare completă ar necesita backend)
        extractedText = `[Fișier ${fileType.toUpperCase()} încărcat: ${file.name}. Yana va analiza conținutul.]`;
        toast.info(`Fișierul ${fileType.toUpperCase()} a fost încărcat. Descrie-mi despre ce e vorba.`);
      }

      // Salvează în baza de date
      const { error: insertError } = await supabase
        .from('user_strategic_documents')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_path: `strategic-docs/${userId}/${Date.now()}-${file.name}`,
          file_type: fileType,
          file_size_bytes: file.size,
          extracted_text: extractedText.slice(0, 50000), // Limită 50k caractere
          conversation_id: conversationId,
          metadata: { originalType: file.type }
        });

      if (insertError) {
        logger.error("❌ [DOC-UPLOAD] Insert error:", insertError);
        throw insertError;
      }

      // Trimite textul extras la callback
      if (extractedText && !extractedText.startsWith('[Fișier')) {
        onDocumentProcessed(
          `📎 Am atașat documentul "${file.name}":\n\n${extractedText.slice(0, 3000)}${extractedText.length > 3000 ? '\n\n[...text trunchiat...]' : ''}`,
          file.name
        );
      } else {
        onDocumentProcessed(
          `📎 Am încărcat fișierul "${file.name}". Te rog spune-mi despre ce e vorba sau ce întrebări ai despre el.`,
          file.name
        );
      }

      toast.success(`Documentul "${file.name}" a fost încărcat!`);
      logger.log(`✅ [DOC-UPLOAD] Successfully processed ${file.name}`);

    } catch (error) {
      logger.error("❌ [DOC-UPLOAD] Error:", error);
      toast.error("Eroare la procesarea documentului. Încearcă din nou.");
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
      // Reset input pentru a permite re-upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      {uploadedFile ? (
        <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-xs">
          <FileText className="h-3 w-3 text-primary" />
          <span className="max-w-[100px] truncate">{uploadedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={clearUpload}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Atașează document (PDF, Word, TXT, Excel)</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
