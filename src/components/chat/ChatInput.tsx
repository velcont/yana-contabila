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
    <div className="border-t px-3 py-3 md:px-6 md:py-4">
      <div className="flex gap-2">
        {showFileUpload && onFileUpload && (
          <Button
            variant="secondary"
            size="icon"
            onClick={onFileUpload}
            disabled={isLoading || disabled}
            className="h-11 w-11 md:h-[60px] md:w-[60px] flex-shrink-0 bg-muted hover:bg-muted/80"
          >
            <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        )}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="min-h-11 md:min-h-[60px] resize-none text-sm md:text-base"
          disabled={isLoading || disabled}
        />
        <Button
          onClick={onSend}
          disabled={!value.trim() || isLoading || disabled}
          size="icon"
          className="h-11 w-11 md:h-[60px] md:w-[60px] flex-shrink-0 bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 hidden md:block">
        Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă
      </p>
    </div>
  );
};
