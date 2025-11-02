import { useState, useEffect } from 'react';
import { Star, Tag, FileText, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FavoriteAnalysis {
  id: string;
  label: string;
  notes: string | null;
  color: string;
  created_at: string;
  analysis_id: string;
  analyses: {
    file_name: string;
    created_at: string;
    company_name: string | null;
  };
}

export const FavoriteAnalyses = () => {
  const [favorites, setFavorites] = useState<FavoriteAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorite_analyses')
        .select(`
          *,
          analyses:analysis_id (
            file_name,
            created_at,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setFavorites(data as any);
    } catch (error) {
      console.error('Eroare încărcare favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('favorite_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Șters',
        description: 'Analiza a fost eliminată din favorite'
      });

      loadFavorites();
    } catch (error) {
      console.error('Eroare ștergere:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge analiza',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Se încarcă...</div>;
  }

  if (favorites.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nu ai încă analize favorite. Salvează analizele importante cu etichete pentru acces rapid!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Analize Favorite ({favorites.length})
        </h3>
      </div>

      <div className="grid gap-4">
        {favorites.map((fav) => (
          <Card key={fav.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 px-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" style={{ color: fav.color }} />
                    {fav.label}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {fav.analyses.file_name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(fav.analyses.created_at).toLocaleDateString('ro-RO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFavorite(fav.id)}
                  className="hover:text-destructive"
                  aria-label="Șterge din favorite"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {fav.notes && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                  {fav.notes}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

// Helper component pentru a salva analize ca favorite
export const AddToFavorites = ({ analysisId }: { analysisId: string }) => {
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  const saveFavorite = async () => {
    if (!label.trim()) {
      toast({
        title: 'Etichetă obligatorie',
        description: 'Introdu o etichetă pentru analiză',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      const { error } = await supabase
        .from('favorite_analyses')
        .insert({
          user_id: user.id,
          analysis_id: analysisId,
          label: label.trim(),
          notes: notes.trim() || null,
          color
        } as any); // folosim "as any" pentru că TypeScript nu recunoaște toate câmpurile

      if (error) throw error;

      toast({
        title: '⭐ Salvat la favorite',
        description: 'Analiza a fost salvată cu succes'
      });

      setIsOpen(false);
      setLabel('');
      setNotes('');
    } catch (error: any) {
      console.error('Eroare salvare:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Deja în favorite',
          description: 'Această analiză este deja salvată',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut salva analiza',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Star className="h-4 w-4" />
          Salvează la favorite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvează Analiza</DialogTitle>
          <DialogDescription>
            Adaugă o etichetă și note pentru acces rapid în viitor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Etichetă *</label>
            <Input
              placeholder="ex: Q1 2024, Analiză importantă"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Culoare</label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note (opțional)</label>
            <Textarea
              placeholder="Adaugă note despre această analiză..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Anulează
          </Button>
          <Button onClick={saveFavorite}>
            Salvează
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
