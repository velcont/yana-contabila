import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileUpload?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  showFileUpload?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onFileUpload,
  isLoading,
  disabled,
  placeholder = 'Scrie mesajul tău...',
  showFileUpload = false,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="border-t px-6 py-4">
      <div className="flex gap-2">
        {showFileUpload && onFileUpload && (
          <Button
            variant="outline"
            size="icon"
            onClick={onFileUpload}
            disabled={isLoading || disabled}
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="min-h-[60px] resize-none"
          disabled={isLoading || disabled}
        />
        <Button
          onClick={onSend}
          disabled={!value.trim() || isLoading || disabled}
          size="icon"
          className="h-[60px] w-[60px] flex-shrink-0 bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă
      </p>
    </div>
  );
};
