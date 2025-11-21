import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { saveAs } from 'file-saver';
import { 
  generateFinancialReport,
  type GenerateReportOptions,
  type ReportGrokValidation,
  type ReportPreviousData
} from '@/utils/generateFinancialReport';

interface UseWordGeneratorOptions {
  analysisId?: string;
  structuredData?: any;
  companyInfo?: {
    name: string;
    cui: string;
    period: string;
  };
  isAccountantMode?: boolean;
}

export function useWordGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  /**
   * Validare Grok înainte de generare
   */
  const validateWithGrok = async (
    structuredData: any,
    companyInfo: any,
    analysisText: string
  ): Promise<ReportGrokValidation | null> => {
    setIsValidating(true);
    
    try {
      toast({ title: '🔍 Validare Grok în curs...', description: '10-15 secunde', duration: 15000 });
      
      const { data, error } = await supabase.functions.invoke('validate-balance-with-grok', {
        body: { 
          structuredData,
          companyInfo: {
            name: companyInfo.name,
            cui: structuredData?.metadata?.cui,
            period: structuredData?.metadata?.perioada
          },
          analysisText
        }
      });
      
      if (error) throw error;
      
      console.log('[useWordGenerator] Grok validation:', data);

      // LOGICA DE BLOCARE STRICTĂ
      if (data.validation_status === 'CRITICAL' || !data.ready_for_report) {
        toast({ title: '🚨 Validare FAILED!', description: 'Generarea raportului este BLOCATĂ!', variant: 'destructive', duration: 10000 });
        setIsValidating(false);
        return null; // STOP - nu permite generare
      }
      
      if (data.validation_status === 'WARNING') {
        toast({ title: '⚠️ Avertismente detectate', description: 'Raportul va include secțiunea Validare Grok', duration: 5000 });
      } else {
        toast({ title: '✅ Validare Grok OK!', duration: 3000 });
      }

      setIsValidating(false);
      return data as ReportGrokValidation;
      
    } catch (error: any) {
      console.error('[useWordGenerator] Validation error:', error);
      toast({ title: 'Eroare validare Grok', description: error.message, variant: 'destructive', duration: 5000 });
      setIsValidating(false);
      return null;
    }
  };

  /**
   * Preluare raport precedent din DB pentru comparație
   */
  const getPreviousReport = async (
    userId: string, 
    cui: string, 
    currentEndDate: string
  ): Promise<ReportPreviousData | null> => {
    try {
      const { data, error } = await supabase
        .from('rapoarte_metadata')
        .select('*')
        .eq('user_id', userId)
        .eq('cui', cui)
        .lt('perioada_end', currentEndDate)
        .order('perioada_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.log('[useWordGenerator] Eroare preluare raport precedent:', error.message);
        return null;
      }
      
      if (!data) {
        console.log('[useWordGenerator] Nu există raport precedent pentru CUI:', cui);
        return null;
      }

      console.log('[useWordGenerator] Raport precedent găsit:', {
        perioada: data.perioada_end
      });

      return data as ReportPreviousData;
    } catch (error: any) {
      console.error('[useWordGenerator] Eroare preluare precedent:', error);
      return null;
    }
  };

  /**
   * Salvare metadata raport în DB
   */
  const saveReportMetadata = async (
    userId: string,
    cui: string,
    companyName: string,
    startDate: string,
    endDate: string,
    metadata: any
  ) => {
    try {
      const { error } = await supabase
        .from('rapoarte_metadata')
        .insert({
          user_id: userId,
          cui,
          company_name: companyName,
          perioada_start: startDate,
          perioada_end: endDate,
          metadata: {
            profit: metadata.profit || 0,
            ca: metadata.ca || 0,
            cheltuieli: metadata.cheltuieli || 0,
            generated_at: new Date().toISOString()
          }
        });

      if (error) {
        console.error('[useWordGenerator] Eroare salvare metadata:', error);
      } else {
        console.log('[useWordGenerator] Metadata salvată cu succes');
      }
    } catch (error: any) {
      console.error('[useWordGenerator] Eroare salvare metadata:', error);
    }
  };

  /**
   * Funcția principală de generare raport
   */
  const generate = async (options: UseWordGeneratorOptions) => {
    const { analysisId, structuredData, companyInfo, isAccountantMode = false } = options;

    if (!structuredData || !companyInfo) {
      toast({ title: 'Eroare', description: 'Date insuficiente pentru generarea raportului', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    console.log('[useWordGenerator] START generare raport', {
      analysisId,
      company: companyInfo.name,
      cui: companyInfo.cui,
      mode: isAccountantMode ? 'CONTABIL' : 'ANTREPRENOR'
    });

    try {
      // 1. Autentificare
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilizator neautentificat');
      }

      // 2. Extragere date necesare
      const cui = companyInfo.cui || structuredData.metadata?.cui || '';
      const endDate = structuredData.metadata?.dataSfarsit || new Date().toISOString().split('T')[0];
      const startDate = structuredData.metadata?.dataInceput || endDate;

      // 3. Validare Grok (OBLIGATORIE)
      const grokValidation = await validateWithGrok(
        structuredData,
        companyInfo,
        '' // analysisText nu e disponibil în Chat, dar nu e critic pentru validare
      );

      if (!grokValidation) {
        toast({ title: 'Validare Grok eșuată', description: 'Generare anulată', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      // 4. Preluare raport precedent pentru comparație
      const previousReport = await getPreviousReport(user.id, cui, endDate);

      // 5. Preluare branding contabil (dacă e cazul)
      let brandingConfig = {};
      if (isAccountantMode) {
        // TODO: Branding contabil - când vor fi adăugate coloanele în profiles
        // const { data: profile } = await supabase
        //   .from('profiles')
        //   .select('accountant_logo_url, accountant_brand_color')
        //   .eq('id', user.id)
        //   .single();
        
        console.log('[useWordGenerator] Branding contabil momentan indisponibil');
      }

      // 6. Generare raport (funcție pură)
      toast({ title: '📄 Generare raport în curs...', duration: 5000 });

      const reportOptions: GenerateReportOptions = {
        structuredData,
        companyInfo,
        isAccountantMode,
        grokValidation,
        previousReport: previousReport || undefined,
        brandingConfig
      };

      const blob = await generateFinancialReport(reportOptions);

      // 7. Salvare metadata în DB
      const reportMetadata = {
        profit: structuredData.accounts?.find((a: any) => a.code === '121')?.credit || 0,
        ca: structuredData.accounts?.filter((a: any) => a.accountClass === 7)
          .reduce((sum: number, a: any) => sum + a.credit, 0) || 0,
        cheltuieli: structuredData.accounts?.filter((a: any) => a.accountClass === 6)
          .reduce((sum: number, a: any) => sum + a.debit, 0) || 0
      };

      await saveReportMetadata(
        user.id,
        cui,
        companyInfo.name,
        startDate,
        endDate,
        reportMetadata
      );

      // 8. Download fișier
      const fileName = `Raport_Financiar_${companyInfo.name.replace(/\s+/g, '_')}_${endDate}.docx`;
      saveAs(blob, fileName);

      toast({ title: '✅ Raport descărcat cu succes!', duration: 5000 });
      console.log('[useWordGenerator] Raport generat cu succes:', fileName);

    } catch (error: any) {
      console.error('[useWordGenerator] Eroare generare:', error);
      toast({ title: 'Eroare generare raport', description: error.message, variant: 'destructive', duration: 7000 });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    isValidating
  };
}
