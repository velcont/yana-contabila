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

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/msword': 'word',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Parsează PDF în client folosind pdfjs-dist (text-based PDFs)
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib: any = await import('pdfjs-dist');
  // Worker via CDN (compatibil Vite)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 30); // limită rezonabilă
  let fullText = '';

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += `\n--- Pagina ${i} ---\n${pageText}\n`;
  }

  if (pdf.numPages > maxPages) {
    fullText += `\n[...PDF trunchiat la ${maxPages}/${pdf.numPages} pagini...]`;
  }

  return fullText.trim();
}

/**
 * Parsează Excel în client folosind xlsx (toate sheet-urile, format text)
 */
async function extractExcelText(file: File): Promise<string> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  let fullText = '';
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ' });
    fullText += `\n=== Sheet: ${sheetName} ===\n${csv}\n`;
  }
  return fullText.trim();
}

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

    const fileType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (!fileType) {
      toast.error("Tip de fișier neacceptat. Încarcă PDF, Word, TXT sau Excel.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Fișierul este prea mare. Limita este 10MB.");
      return;
    }

    setIsUploading(true);
    setUploadedFile({ name: file.name, type: fileType });

    try {
      logger.log(`📎 [DOC-UPLOAD] Processing ${file.name} (${fileType})`);

      let extractedText = "";

      if (fileType === 'txt') {
        extractedText = await file.text();
      } else if (fileType === 'word') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (fileType === 'pdf') {
        try {
          extractedText = await extractPdfText(file);
          if (!extractedText || extractedText.length < 20) {
            extractedText = `[PDF "${file.name}" pare a fi scanat (imagine). Nu s-a putut extrage text. Te rog descrie conținutul sau folosește un PDF text.]`;
          }
        } catch (e) {
          logger.error('PDF parse error:', e);
          extractedText = `[Eroare la citirea PDF "${file.name}". Încearcă alt fișier sau descrie conținutul.]`;
        }
      } else if (fileType === 'excel') {
        try {
          extractedText = await extractExcelText(file);
        } catch (e) {
          logger.error('Excel parse error:', e);
          extractedText = `[Eroare la citirea Excel "${file.name}". Verifică formatul fișierului.]`;
        }
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
          extracted_text: extractedText.slice(0, 50000),
          conversation_id: conversationId,
          metadata: { originalType: file.type, parsed_in: 'client' }
        });

      if (insertError) {
        logger.error("❌ [DOC-UPLOAD] Insert error:", insertError);
      }

      // Trimite textul real la callback (trunchiat dacă e prea lung)
      const TEXT_LIMIT = 8000;
      const truncated = extractedText.length > TEXT_LIMIT;
      const textForChat = truncated
        ? extractedText.slice(0, TEXT_LIMIT) + `\n\n[...text trunchiat: ${extractedText.length} caractere total, primele ${TEXT_LIMIT} afișate...]`
        : extractedText;

      onDocumentProcessed(
        `📎 Am atașat documentul "${file.name}" (${fileType.toUpperCase()}):\n\n${textForChat}`,
        file.name
      );

      toast.success(`Documentul "${file.name}" a fost procesat (${extractedText.length} caractere extrase)!`);
      logger.log(`✅ [DOC-UPLOAD] Successfully processed ${file.name} (${extractedText.length} chars)`);

    } catch (error) {
      logger.error("❌ [DOC-UPLOAD] Error:", error);
      toast.error("Eroare la procesarea documentului. Încearcă din nou.");
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
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
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">Documente de business</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Word, TXT, Excel — Yana citește conținutul direct
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              💡 Pentru analiză balanță contabilă completă, folosește ChatAI
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
