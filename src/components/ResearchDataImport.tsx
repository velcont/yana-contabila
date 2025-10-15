import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';
import { z } from 'zod';

const ResearchDataSchema = z.object({
  data_collection_date: z.string(),
  course_name: z.string(),
  research_theme: z.string(),
  case_studies: z.array(z.any()),
  theoretical_frameworks: z.array(z.any()),
  metrics_collected: z.object({
    avg_digital_maturity_score: z.string().optional(),
    avg_resilience_score: z.string().optional(),
    common_challenges: z.array(z.string()).optional(),
    success_factors: z.array(z.string()).optional(),
  }),
  research_notes: z.string().optional(),
});

export function ResearchDataImport({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast({
        title: "Eroare",
        description: "Te rog introdu JSON-ul de la ChatGPT",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Parse JSON
      const parsedData = JSON.parse(jsonInput);
      
      // Validate structure
      const validatedData = ResearchDataSchema.parse(parsedData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nu ești autentificat');
      }

      // Insert into database
      const { error } = await supabase
        .from('research_data')
        .insert({
          user_id: user.id,
          data_collection_date: validatedData.data_collection_date,
          course_name: validatedData.course_name,
          research_theme: validatedData.research_theme,
          case_studies: validatedData.case_studies,
          theoretical_frameworks: validatedData.theoretical_frameworks,
          metrics_collected: validatedData.metrics_collected,
          research_notes: validatedData.research_notes || null,
        });

      if (error) throw error;

      toast({
        title: "✅ Date importate cu succes!",
        description: `Datele din "${validatedData.course_name}" au fost salvate.`,
      });

      setJsonInput('');
      setOpen(false);
      
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error('Import error:', error);
      
      if (error instanceof z.ZodError) {
        toast({
          title: "Eroare validare JSON",
          description: "Structura JSON-ului nu este corectă. Verifică formatul dat de ChatGPT.",
          variant: "destructive",
        });
      } else if (error instanceof SyntaxError) {
        toast({
          title: "JSON invalid",
          description: "JSON-ul nu este valid. Verifică că ai copiat tot și că nu lipsesc ghilimele sau virgule.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Eroare",
          description: error instanceof Error ? error.message : "Nu s-au putut importa datele",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Date Cercetare
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Date de Cercetare Doctorat</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Lipește aici JSON-ul generat de ChatGPT personalizat din cursurile tale de doctorat.</p>
            <p className="text-xs text-muted-foreground">Folosește comanda "Exportă date reziliență" în ChatGPT pentru a obține formatul corect.</p>
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">📋 Vezi exemplu format JSON valid</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
{`{
  "data_collection_date": "2025-10-15",
  "course_name": "Inovație Digitală și Modele Sustenabile",
  "research_theme": "Transformarea rezilienței în avantaj competitiv",
  "case_studies": [
    {"company": "Tesla", "industry": "Automotive", "focus": "Digital innovation"}
  ],
  "theoretical_frameworks": [
    {"name": "Porter's Competitive Advantage", "application": "Sustainability"}
  ],
  "metrics_collected": {
    "avg_digital_maturity_score": "7.5",
    "avg_resilience_score": "8.2",
    "common_challenges": ["Digitalizare", "Sustenabilitate"],
    "success_factors": ["Leadership etic", "Parteneriate universități"]
  },
  "research_notes": "Analiza contribuțiilor relevante..."
}`}
              </pre>
            </details>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder='{"data_collection_date": "2025-10-06", "course_name": "...", ...}'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Anulează
            </Button>
            <Button 
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se importă...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importă Date
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
