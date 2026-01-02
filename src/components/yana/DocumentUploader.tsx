import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  onUpload: (file: File, content: string) => void;
  onClose: () => void;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function DocumentUploader({ onUpload, onClose }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE_MB = 10;

  const processFile = async (file: File) => {
    // Guard clause: verificare dimensiune fișier
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Fișierul este prea mare (${(file.size / 1024 / 1024).toFixed(1)}MB). Limita este ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const extension = file.name.toLowerCase().split('.').pop();
      let content = '';

      if (['xlsx', 'xls'].includes(extension || '')) {
        // IMPORTANT: analyze-balance expects Excel as base64 (data URL accepted)
        content = await readAsDataURL(file);
      } else if (extension === 'pdf') {
        // Keep as data URL (base64) for backend processing if needed
        content = await readAsDataURL(file);
      } else if (extension === 'docx') {
        // Extract text from DOCX
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else if (extension === 'doc') {
        // .doc is legacy binary; keep minimal placeholder
        content = `Document Word (.doc) încărcat: ${file.name}`;
      } else {
        // Plain text
        content = await file.text();
      }

      onUpload(file, content);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Nu am putut procesa fișierul. Încearcă din nou.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Încarcă document</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Drop Zone */}
        <div className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border',
              isProcessing && 'opacity-50 pointer-events-none'
            )}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Se procesează...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6 text-success" />
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-destructive" />
                  </div>
                </div>
                
                <p className="text-foreground font-medium mb-1">
                  Trage un fișier aici
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  sau click pentru a selecta
                </p>
                
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx,.xls,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Selectează fișier
                  </label>
                </Button>
              </>
            )}
          </div>

          {error && (
            <p className="mt-3 text-sm text-destructive text-center">{error}</p>
          )}

          <div className="mt-4 text-xs text-muted-foreground text-center">
            <p>Formate acceptate: Excel (.xlsx, .xls), PDF, Word (.doc, .docx)</p>
            <p className="mt-1">Balanțele Excel sunt procesate automat pentru analiză.</p>
          </div>
        </div>
      </div>
    </div>
  );
}