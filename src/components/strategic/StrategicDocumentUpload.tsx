import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StrategicDocumentUploadProps {
  conversationId: string;
  onFactsExtracted?: (facts: any[]) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".xls", ".xlsx"];

export function StrategicDocumentUpload({ 
  conversationId, 
  onFactsExtracted,
  disabled = false 
}: StrategicDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(fileExtension);
    
    if (!isValidType) {
      toast({
        title: "Tip fișier invalid",
        description: "Sunt acceptate doar fișiere PDF, CSV sau Excel.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă este 10MB.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    await processFile(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus("uploading");
    setStatusMessage("Se încarcă documentul...");

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Trebuie să fii autentificat");
      }

      // Sanitize filename - remove special characters that cause storage issues
      const sanitizedFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special chars with underscore
        .replace(/_+/g, "_"); // Collapse multiple underscores
      
      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("strategic-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Eroare la încărcare: ${uploadError.message}`);
      }

      setUploadStatus("processing");
      setStatusMessage("Se procesează documentul...");

      // Create document record
      const { data: docRecord, error: insertError } = await supabase
        .from("strategic_documents")
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          processing_status: "processing",
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Eroare la salvare: ${insertError.message}`);
      }

      // Convert file to base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Process with edge function
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        "process-strategic-document",
        {
          body: {
            documentId: docRecord.id,
            conversationId,
            fileContent,
            fileName: file.name,
            fileType: file.type,
          },
        }
      );

      if (processError) {
        throw new Error(`Eroare la procesare: ${processError.message}`);
      }

      if (processResult?.error) {
        throw new Error(processResult.error);
      }

      setUploadStatus("success");
      setStatusMessage(`✅ ${processResult.factsExtracted} date extrase din ${file.name}`);

      toast({
        title: "Document procesat",
        description: `Am extras ${processResult.factsExtracted} date financiare. Cost: 0.50 RON`,
        duration: 5000,
      });

      // Notify parent about extracted facts
      if (onFactsExtracted && processResult.facts) {
        onFactsExtracted(processResult.facts);
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setUploadStatus("idle");
        setStatusMessage("");
      }, 3000);

    } catch (error) {
      console.error("Document upload error:", error);
      setUploadStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Eroare necunoscută");
      
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Eroare la procesare document",
        variant: "destructive",
        duration: 7000,
      });

      // Reset status after 5 seconds
      setTimeout(() => {
        setUploadStatus("idle");
        setStatusMessage("");
      }, 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="gap-2"
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">
          {isUploading ? "Se procesează..." : "Încarcă document"}
        </span>
        <span className="sm:hidden">
          {isUploading ? "..." : "📄"}
        </span>
      </Button>

      {statusMessage && (
        <p className={`text-xs ${
          uploadStatus === "success" ? "text-green-600" : 
          uploadStatus === "error" ? "text-destructive" : 
          "text-muted-foreground"
        }`}>
          {statusMessage}
        </p>
      )}

      <p className="text-xs text-muted-foreground hidden md:block">
        PDF, CSV, Excel • Max 10MB • 0.50 RON/doc
      </p>
    </div>
  );
}
