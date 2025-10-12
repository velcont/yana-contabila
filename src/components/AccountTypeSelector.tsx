import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountTypeSelectorProps {
  open: boolean;
  onComplete: () => void;
}

export const AccountTypeSelector = ({ open, onComplete }: AccountTypeSelectorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const selectAccountType = async (type: 'entrepreneur' | 'accounting_firm') => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_type: type,
          account_type_selected: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Tip cont selectat",
        description: type === 'entrepreneur' 
          ? "Contul tău de antreprenor a fost configurat cu succes!" 
          : "Contul tău de contabil a fost configurat cu succes!",
      });

      onComplete();
    } catch (error) {
      console.error('Error selecting account type:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut selecta tipul de cont. Te rugăm să încerci din nou.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Alege tipul de cont</DialogTitle>
          <DialogDescription>
            Selectează tipul de cont care corespunde nevoilor tale. Această alegere este permanentă și nu poate fi schimbată ulterior.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card 
            className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all bg-blue-50 dark:bg-blue-950/20"
            onClick={() => !isLoading && selectAccountType('entrepreneur')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-2">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-blue-600 dark:text-blue-400">Antreprenor</CardTitle>
              <CardDescription>
                Pentru afaceri și companii
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>✓ Analizează balanțele contabile</li>
                <li>✓ Gestionează multiple firme</li>
                <li>✓ Chat AI pentru afacerea ta</li>
                <li>✓ Rapoarte și predicții</li>
              </ul>
              <Button 
                className="w-full mt-4 bg-blue-500 hover:bg-blue-600"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  selectAccountType('entrepreneur');
                }}
              >
                {isLoading ? 'Se procesează...' : 'Selectează Antreprenor'}
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all bg-green-50 dark:bg-green-950/20"
            onClick={() => !isLoading && selectAccountType('accounting_firm')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-green-600 dark:text-green-400">Contabil</CardTitle>
              <CardDescription>
                Pentru firme de contabilitate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>✓ Dashboard dedicat pentru clienți</li>
                <li>✓ Comparații multi-firmă</li>
                <li>✓ Invită și gestionează clienți</li>
                <li>✓ Alerte proactive pentru clienți</li>
              </ul>
              <Button 
                className="w-full mt-4 bg-green-500 hover:bg-green-600"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  selectAccountType('accounting_firm');
                }}
              >
                {isLoading ? 'Se procesează...' : 'Selectează Contabil'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
