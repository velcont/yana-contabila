import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateFileMimeType } from '@/utils/edgeFunctionHelpers';

interface BalanceUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const BalanceUploader = ({ onFileUpload, isLoading, disabled }: BalanceUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validare dimensiune
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: '❌ Fișier prea mare',
        description: `Fișierul depășește limita de 10MB. Dimensiune: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: 'destructive',
      });
      return;
    }

    // Validare MIME type
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!validateFileMimeType(base64, ALLOWED_MIME_TYPES)) {
        toast({
          title: '❌ Format invalid',
          description: 'Te rog încarcă un fișier Excel (.xls sau .xlsx)',
          variant: 'destructive',
        });
        return;
      }

      // Fișier valid - procesează
      await onFileUpload(file);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        disabled={disabled || isLoading}
      />
      <Button
        onClick={handleFileClick}
        variant="outline"
        size="icon"
        disabled={disabled || isLoading}
        className="shrink-0"
        title="Încarcă balanță Excel"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
};
