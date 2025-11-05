import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  content: z.string().optional(),
});

// Schema for array of courses
const ResearchDataArraySchema = z.array(ResearchDataSchema);

export function ResearchDataImport({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Real-time validation and preview
  const validation = useMemo(() => {
    if (!jsonInput.trim()) {
      return { isValid: false, error: null, coursesCount: 0, parsed: null };
    }

    try {
      const parsed = JSON.parse(jsonInput);
      
      // Try both single and array format
      let coursesData: any[];
      if (Array.isArray(parsed)) {
        ResearchDataArraySchema.parse(parsed);
        coursesData = parsed;
      } else {
        ResearchDataSchema.parse(parsed);
        coursesData = [parsed];
      }

      return {
        isValid: true,
        error: null,
        coursesCount: coursesData.length,
        parsed: coursesData
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          isValid: false,
          error: 'JSON invalid - verifică ghilimelele și virgulele',
          coursesCount: 0,
          parsed: null
        };
      } else if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return {
          isValid: false,
          error: `Câmp lipsă sau invalid: ${firstError.path.join('.')}`,
          coursesCount: 0,
          parsed: null
        };
      }
      return {
        isValid: false,
        error: 'Format necunoscut',
        coursesCount: 0,
        parsed: null
      };
    }
  }, [jsonInput]);

  const handleImport = async () => {
    if (!validation.isValid || !validation.parsed) {
      toast({
        title: "Eroare",
        description: validation.error || "Te rog introdu JSON valid de la ChatGPT",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nu ești autentificat');
      }

      // Prepare data for insert
      const coursesToInsert = validation.parsed.map((course: any) => ({
        user_id: user.id,
        data_collection_date: course.data_collection_date,
        course_name: course.course_name,
        research_theme: course.research_theme,
        case_studies: course.case_studies,
        theoretical_frameworks: course.theoretical_frameworks,
        metrics_collected: course.metrics_collected,
        research_notes: course.research_notes || null,
        content: course.content || null,
      }));

      // Insert into database
      const { error } = await supabase
        .from('research_data')
        .insert(coursesToInsert);

      if (error) throw error;

      toast({
        title: "✅ Date importate cu succes!",
        description: `${validation.coursesCount} ${validation.coursesCount === 1 ? 'curs importat' : 'cursuri importate'} din ChatGPT.`,
      });

      setJsonInput('');
      setOpen(false);
      
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Eroare la salvare",
        description: error instanceof Error ? error.message : "Nu s-au putut importa datele în baza de date",
        variant: "destructive",
      });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Import Date de Cercetare Doctorat
            </DialogTitle>
            {jsonInput && (
              <Badge variant={validation.isValid ? "default" : "destructive"} className="gap-1">
                {validation.isValid ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Valid - {validation.coursesCount} {validation.coursesCount === 1 ? 'curs' : 'cursuri'}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Invalid
                  </>
                )}
              </Badge>
            )}
          </div>
          <DialogDescription className="space-y-2">
            <p>Lipește aici JSON-ul generat de ChatGPT din cursurile tale de doctorat.</p>
            <p className="text-xs text-muted-foreground">💡 Folosește comanda <code className="bg-muted px-1 py-0.5 rounded">"Exportă date reziliență"</code> în ChatGPT</p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Validation Alert */}
          {jsonInput && !validation.isValid && validation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Preview */}
          {validation.isValid && validation.parsed && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Preview:</strong> Gata de import - {validation.coursesCount} {validation.coursesCount === 1 ? 'curs detectat' : 'cursuri detectate'}
                <ul className="mt-2 space-y-1 text-xs">
                  {validation.parsed.slice(0, 3).map((course: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span><strong>{course.course_name}</strong> - {course.research_theme}</span>
                    </li>
                  ))}
                  {validation.coursesCount > 3 && (
                    <li className="text-muted-foreground">... și încă {validation.coursesCount - 3} cursuri</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* JSON Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">JSON de la ChatGPT:</label>
            <Textarea
              placeholder='Lipește aici JSON-ul... Poate fi un singur curs sau un array de cursuri:
[
  {
    "id": "uuid-generated",
    "data_collection_date": "2025-10-15",
    "course_name": "Curs 1",
    "research_theme": "Tema de cercetare",
    ...
  }
]'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
          </div>

          {/* Example Format */}
          <details className="text-xs border rounded-lg p-3">
            <summary className="cursor-pointer font-medium mb-2">📋 Vezi exemplu format JSON valid</summary>
            <pre className="mt-2 p-3 bg-muted rounded text-[10px] overflow-x-auto">
{`[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "data_collection_date": "2025-10-15",
    "course_name": "Inovație Digitală și Modele Sustenabile",
    "research_theme": "Transformarea rezilienței în avantaj competitiv",
    "case_studies": [
      {
        "company": "Tesla",
        "industry": "Automotive",
        "focus": "Digital innovation"
      }
    ],
    "theoretical_frameworks": [
      {
        "name": "Porter's Competitive Advantage",
        "application": "Sustainability analysis"
      }
    ],
    "metrics_collected": {
      "avg_digital_maturity_score": "7.5",
      "avg_resilience_score": "8.2",
      "common_challenges": ["Digitalizare", "Sustenabilitate"],
      "success_factors": ["Leadership etic", "Parteneriate"]
    },
    "research_notes": "Observații relevante din curs...",
    "content": "Conținut complet din cursul Zoom..."
  }
]`}
            </pre>
          </details>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Anulează
          </Button>
          <Button 
            onClick={handleImport}
            disabled={loading || !validation.isValid}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se importă {validation.coursesCount} {validation.coursesCount === 1 ? 'curs' : 'cursuri'}...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importă {validation.coursesCount || ''} {validation.coursesCount === 1 ? 'Curs' : validation.coursesCount > 1 ? 'Cursuri' : 'Date'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
