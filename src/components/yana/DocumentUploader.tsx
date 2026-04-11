import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, Image, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  file: File;
  content: string;
}

interface DocumentUploaderProps {
  onUpload: (files: UploadedFile[]) => void;
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

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 10;

export function DocumentUploader({ onUpload, onClose }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [processingCount, setProcessingCount] = useState(0);

  const processFile = async (file: File): Promise<UploadedFile | null> => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`${file.name} este prea mare (${(file.size / 1024 / 1024).toFixed(1)}MB). Limita: ${MAX_FILE_SIZE_MB}MB.`);
      return null;
    }

    try {
      const extension = file.name.toLowerCase().split('.').pop();
      let content = '';

      if (['xlsx', 'xls'].includes(extension || '')) {
        content = await readAsDataURL(file);
      } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
        content = await readAsDataURL(file);
      } else if (extension === 'pdf') {
        content = await readAsDataURL(file);
      } else if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else if (extension === 'doc') {
        content = `Document Word (.doc) încărcat: ${file.name}`;
      } else {
        content = await file.text();
      }

      return { file, content };
    } catch (err) {
      console.error('Error processing file:', err);
      setError(`Nu am putut procesa ${file.name}.`);
      return null;
    }
  };

  const addFiles = async (fileList: File[]) => {
    const totalAfter = pendingFiles.length + fileList.length;
    if (totalAfter > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} fișiere. Ai selectat ${totalAfter}.`);
      return;
    }

    // Filter duplicates by name
    const existingNames = new Set(pendingFiles.map(f => f.file.name));
    const newFiles = fileList.filter(f => !existingNames.has(f.name));
    if (newFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProcessingCount(newFiles.length);

    const results: UploadedFile[] = [];
    for (const file of newFiles) {
      const result = await processFile(file);
      if (result) results.push(result);
    }

    setPendingFiles(prev => [...prev, ...results]);
    setIsProcessing(false);
    setProcessingCount(0);
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (pendingFiles.length === 0) return;
    onUpload(pendingFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFiles(files);
  }, [pendingFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addFiles(files);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Încarcă documente
            {pendingFiles.length > 0 && (
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                ({pendingFiles.length}/{MAX_FILES})
              </span>
            )}
          </h3>
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
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border',
              isProcessing && 'opacity-50 pointer-events-none'
            )}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Se procesează {processingCount} fișier(e)...</p>
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
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <p className="text-foreground font-medium mb-1">
                  Trage fișierele aici
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  sau click pentru a selecta (max {MAX_FILES} fișiere)
                </p>
                
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  multiple
                />
                <Button variant="outline" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Selectează fișiere
                  </label>
                </Button>
              </>
            )}
          </div>

          {/* Pending files list */}
          {pendingFiles.length > 0 && (
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {pendingFiles.map((uf, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span className="truncate flex-1 text-foreground">{uf.file.name}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {(uf.file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive text-center">{error}</p>
          )}

          <div className="mt-4 text-xs text-muted-foreground text-center">
            <p>Formate acceptate: Excel (.xlsx, .xls), PDF, Word (.doc, .docx), Imagini (PNG, JPG, WEBP)</p>
          </div>

          {/* Submit button */}
          {pendingFiles.length > 0 && (
            <Button
              className="w-full mt-4"
              onClick={handleSubmit}
              disabled={isProcessing}
            >
              Trimite {pendingFiles.length} fișier{pendingFiles.length > 1 ? 'e' : ''}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
