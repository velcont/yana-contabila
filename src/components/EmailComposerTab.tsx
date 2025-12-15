import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Paperclip, X, Loader2, Send, FileText, Upload } from 'lucide-react';

interface Attachment {
  name: string;
  content: string; // base64
  type: string;
}

export const EmailComposerTab = () => {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Fișier prea mare',
          description: `${file.name} depășește limita de 5MB.`,
          variant: 'destructive'
        });
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          content: base64,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateEmails = (emailString: string): string[] => {
    const emails = emailString.split(/[,;\s]+/).filter(Boolean);
    const validEmails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emails) {
      const trimmed = email.trim();
      if (emailRegex.test(trimmed)) {
        validEmails.push(trimmed);
      }
    }

    return validEmails;
  };

  const handleSend = async () => {
    const validEmails = validateEmails(recipients);

    if (validEmails.length === 0) {
      toast({
        title: 'Destinatari lipsă',
        description: 'Adaugă cel puțin o adresă de email validă.',
        variant: 'destructive'
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: 'Subiect lipsă',
        description: 'Adaugă un subiect pentru email.',
        variant: 'destructive'
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Mesaj lipsă',
        description: 'Scrie un mesaj pentru email.',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nu ești autentificat');

      const response = await supabase.functions.invoke('send-monthly-report', {
        body: {
          clientEmails: validEmails, // Trimite TOATE emailurile ca array
          clientName: '',
          subject: subject.trim(),
          customMessage: message.trim(),
          reportData: {
            companyName: 'Email personalizat',
            period: new Date().toLocaleDateString('ro-RO'),
            personalNote: message.trim()
          },
          attachments: attachments.map(att => ({
            filename: att.name,
            content: att.content
          }))
        }
      });

      if (response.error) throw response.error;

      toast({
        title: '✅ Email trimis',
        description: `Email-ul a fost trimis la ${validEmails.length} destinatar${validEmails.length > 1 ? 'i' : ''}.`
      });

      // Reset form
      setRecipients('');
      setSubject('');
      setMessage('');
      setAttachments([]);

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Eroare la trimitere',
        description: error.message || 'Nu am putut trimite email-ul.',
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Trimite Email cu Atașamente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recipients */}
        <div className="space-y-2">
          <Label htmlFor="recipients">Destinatari</Label>
          <Textarea
            id="recipients"
            placeholder="email1@exemplu.com, email2@exemplu.com"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            className="min-h-[60px]"
          />
          <p className="text-xs text-muted-foreground">
            Separă adresele de email prin virgulă sau spațiu.
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subiect</Label>
          <Input
            id="subject"
            placeholder="Subiectul email-ului"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Mesaj</Label>
          <Textarea
            id="message"
            placeholder="Scrie mesajul tău aici..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[150px]"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-3">
          <Label>Atașamente</Label>
          
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-2 py-1.5 px-3"
                >
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="ml-1 hover:text-destructive"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Adaugă Fișier
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Fișiere acceptate: PDF, Word, Excel, TXT, CSV. Maxim 5MB per fișier.
          </p>
        </div>

        {/* Send Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 min-w-[160px]"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Trimite Email
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
