import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Briefcase } from 'lucide-react';
import { JobCard } from './JobCard';
import { SendOfferForm } from './SendOfferForm';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface JobListing {
  id: string;
  company_name: string;
  cui: string;
  is_vat_payer: boolean;
  tax_type: string;
  documents_per_month: string;
  employees_count: string;
  budget_min: number;
  budget_max: number;
  special_requirements: string | null;
  offers_count: number;
  created_at: string;
}

export const JobListings = () => {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();

    // Realtime subscription pentru job_postings NOI
    const channel = supabase
      .channel('marketplace-jobs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_postings',
          filter: 'status=eq.active'
        },
        (payload) => {
          console.log('🔔 New job posting received:', payload);
          const newJob = payload.new as JobListing;
          
          setJobs(prev => [newJob, ...prev]);
          
          toast({
            title: "🔔 Anunț NOU!",
            description: `${newJob.company_name} caută contabil`,
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = (job: JobListing) => {
    setSelectedJob(job);
    setShowOfferForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Anunțuri Active ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Antreprenori care caută servicii de contabilitate. Trimite oferte pentru a câștiga clienți noi!
          </p>

          {jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există anunțuri active momentan.</p>
              <p className="text-sm">Vei primi notificare când apar anunțuri noi!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <JobCard 
                  key={job.id}
                  job={job}
                  onSendOffer={() => handleSendOffer(job)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showOfferForm} onOpenChange={setShowOfferForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Trimite Ofertă pentru {selectedJob?.company_name}
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <SendOfferForm 
              job={selectedJob}
              onSuccess={() => {
                setShowOfferForm(false);
                loadJobs();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
