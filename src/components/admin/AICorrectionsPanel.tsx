import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Check, X, Clock, Loader2, RefreshCw, MessageSquare, AlertTriangle } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";

interface Correction {
  id: string;
  user_id: string;
  conversation_id: string | null;
  original_question: string;
  wrong_answer: string | null;
  correct_answer: string;
  correction_type: string | null;
  validated_by_admin: boolean;
  applied_to_knowledge: boolean;
  admin_notes: string | null;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  } | null;
}

export function AICorrectionsPanel() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all');
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCorrections();
  }, [filter]);

  const loadCorrections = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('ai_corrections')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (filter === 'pending') {
        query = query.eq('validated_by_admin', false).eq('applied_to_knowledge', false);
      } else if (filter === 'validated') {
        query = query.eq('validated_by_admin', true);
      } else if (filter === 'rejected') {
        query = query.eq('validated_by_admin', false).eq('applied_to_knowledge', false);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Type assertion since we know the structure
      setCorrections((data || []) as unknown as Correction[]);
    } catch (error) {
      console.error("Error loading corrections:", error);
      toast.error("Eroare la încărcarea corecțiilor");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (correction: Correction, approved: boolean) => {
    try {
      setProcessing(true);
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_corrections')
        .update({
          validated_by_admin: approved,
          applied_to_knowledge: approved,
          admin_notes: adminNotes || null,
          validated_at: new Date().toISOString(),
          validated_by: userData?.user?.id || null
        })
        .eq('id', correction.id);
      
      if (error) throw error;
      
      toast.success(approved ? "Corecție validată și aplicată!" : "Corecție respinsă");
      setSelectedCorrection(null);
      setAdminNotes("");
      loadCorrections();
    } catch (error) {
      console.error("Error validating correction:", error);
      toast.error("Eroare la validarea corecției");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_corrections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Corecție ștearsă");
      loadCorrections();
    } catch (error) {
      console.error("Error deleting correction:", error);
      toast.error("Eroare la ștergerea corecției");
    }
  };

  const getStatusBadge = (correction: Correction) => {
    if (correction.validated_by_admin && correction.applied_to_knowledge) {
      return <Badge variant="default" className="bg-green-500">✓ Validată & Aplicată</Badge>;
    }
    if (correction.validated_by_admin) {
      return <Badge variant="default" className="bg-blue-500">✓ Validată</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">⏳ În așteptare</Badge>;
  };

  const stats = {
    total: corrections.length,
    pending: corrections.filter(c => !c.validated_by_admin).length,
    validated: corrections.filter(c => c.validated_by_admin).length,
    applied: corrections.filter(c => c.applied_to_knowledge).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total corecții</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">În așteptare</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.validated}</div>
            <div className="text-sm text-muted-foreground">Validate</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
            <div className="text-sm text-muted-foreground">Aplicate</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toate
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('pending')}
          >
            <Clock className="h-4 w-4 mr-1" />
            În așteptare
          </Button>
          <Button 
            variant={filter === 'validated' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('validated')}
          >
            <Check className="h-4 w-4 mr-1" />
            Validate
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={loadCorrections}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Corrections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Corecții primite de la utilizatori
          </CardTitle>
          <CardDescription>
            Când YANA răspunde greșit și utilizatorul corectează, corecția apare aici pentru validare
          </CardDescription>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există corecții {filter !== 'all' ? 'în această categorie' : ''}</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {corrections.map((correction) => (
                  <Card key={correction.id} className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(correction)}
                            <Badge variant="outline">{correction.correction_type || 'general'}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {correction.profiles?.email || 'Utilizator necunoscut'} • {' '}
                            {format(new Date(correction.created_at), "dd MMM yyyy HH:mm", { locale: ro })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!correction.validated_by_admin && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedCorrection(correction);
                                  setAdminNotes("");
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Validează
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600"
                                onClick={() => handleDelete(correction.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="font-medium text-xs text-muted-foreground mb-1">❓ Întrebarea originală:</p>
                          <p>{correction.original_question}</p>
                        </div>
                        
                        {correction.wrong_answer && (
                          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="font-medium text-xs text-red-600 mb-1">❌ Răspunsul greșit al YANA:</p>
                            <p className="text-red-700 dark:text-red-400">{correction.wrong_answer}</p>
                          </div>
                        )}
                        
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <p className="font-medium text-xs text-green-600 mb-1">✓ Răspunsul corect (de la utilizator):</p>
                          <p className="text-green-700 dark:text-green-400 font-medium">{correction.correct_answer}</p>
                        </div>

                        {correction.admin_notes && (
                          <div className="p-3 bg-blue-500/10 rounded-lg">
                            <p className="font-medium text-xs text-blue-600 mb-1">📝 Note admin:</p>
                            <p>{correction.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={!!selectedCorrection} onOpenChange={() => setSelectedCorrection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validare corecție</DialogTitle>
            <DialogDescription>
              Verifică dacă răspunsul utilizatorului este corect și aprobă pentru a fi folosit de YANA în viitor.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCorrection && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Întrebare:</p>
                <p className="text-sm text-muted-foreground">{selectedCorrection.original_question}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Răspuns corectat:</p>
                <p className="text-sm text-green-600">{selectedCorrection.correct_answer}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Note admin (opțional):</p>
                <Textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adaugă note sau observații..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCorrection(null)}>
              Anulează
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedCorrection && handleValidate(selectedCorrection, false)}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Respinge
            </Button>
            <Button 
              onClick={() => selectedCorrection && handleValidate(selectedCorrection, true)}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Aprobă & Aplică
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
