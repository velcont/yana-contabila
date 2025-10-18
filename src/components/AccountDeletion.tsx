import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';

export const AccountDeletion = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [reason, setReason] = useState('');
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (confirmEmail.toLowerCase().trim() !== user.email?.toLowerCase().trim()) {
      toast({
        title: "Email incorect",
        description: "Emailul introdus nu corespunde cu cel al contului tău.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);

      // Call delete-user function which handles everything:
      // - Deletes user from auth
      // - Logs to deleted_users table (with reason)
      // - Sends confirmation email to user
      // - Sends notification email to office@velcont.com
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { 
          userId: user.id,
          deletionReason: reason.trim() || 'User requested account deletion'
        }
      });

      if (error) throw error;

      toast({
        title: "Cont șters",
        description: "Contul tău a fost șters cu succes. Vei primi un email de confirmare.",
      });

      // Sign out and redirect to landing
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut șterge contul.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Zona Periculoasă
        </CardTitle>
        <CardDescription>
          Acțiuni permanente care nu pot fi anulate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-destructive">⚠️ Atenție: Ștergerea contului este PERMANENTĂ</h4>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>Toate analizele tale vor fi șterse definitiv</li>
              <li>Conversațiile cu AI vor fi eliminate</li>
              <li>Documentele încărcate vor fi șterse</li>
              <li>Toate datele companiei vor fi pierdute</li>
              <li>Această acțiune NU poate fi anulată</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="h-4 w-4" />
                Șterge contul meu permanent
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Confirmă ștergerea contului
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    Această acțiune va șterge <strong>PERMANENT</strong> toate datele tale:
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Analize financiare</li>
                    <li>Conversații AI</li>
                    <li>Documente încărcate</li>
                    <li>Date companii</li>
                    <li>Setări personalizate</li>
                  </ul>
                  
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="confirm-email" className="text-sm font-semibold">
                      Pentru a continua, introdu emailul tău:
                    </Label>
                    <Input
                      id="confirm-email"
                      type="email"
                      placeholder={user?.email || "email@exemplu.com"}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-sm">
                      Motivul ștergerii (opțional):
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="Ne poți spune de ce vrei să ștergi contul? Ce îmbunătățiri ai dori să vezi?"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-background min-h-[80px]"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Vei primi un email de confirmare la adresa ta. De asemenea, vom păstra un jurnal de audit 
                    pentru conformitate GDPR, dar toate datele personale vor fi anonimizate.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel disabled={isDeleting}>
                  Anulează
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !confirmEmail}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Se șterge...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Șterge permanent contul
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
