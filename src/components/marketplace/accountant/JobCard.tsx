import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, FileText, DollarSign, Calendar, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

interface JobCardProps {
  job: {
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
    contact_email: string;
    contact_phone: string;
    offers_count: number;
    created_at: string;
  };
  onSendOffer: () => void;
}

export const JobCard = ({ job, onSendOffer }: JobCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {job.company_name}
              </h3>
              <p className="text-sm text-muted-foreground">CUI: {job.cui}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {job.budget_min}-{job.budget_max} RON
              </div>
              <p className="text-xs text-muted-foreground">/lună</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={job.is_vat_payer ? "default" : "secondary"}>
                {job.is_vat_payer ? "Plătitor TVA" : "Fără TVA"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              {job.documents_per_month} doc/lună
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {job.employees_count} angajați
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ro })}
            </div>
          </div>

          <div>
            <Badge variant="outline" className="text-xs">
              {job.tax_type === 'microenterprise' ? 'Microîntreprindere' :
               job.tax_type === 'profit' ? 'Impozit pe profit' : 'Altul'}
            </Badge>
          </div>

          {job.special_requirements && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm">
                <span className="font-medium">Cerințe speciale:</span> {job.special_requirements}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="font-semibold text-blue-800 text-sm mb-2">📞 Contact Antreprenor</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium min-w-[60px]">Email:</span>
                <a 
                  href={`mailto:${job.contact_email}`} 
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  {job.contact_email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium min-w-[60px]">Telefon:</span>
                <a 
                  href={`tel:${job.contact_phone}`} 
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  {job.contact_phone}
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              {job.offers_count} {job.offers_count === 1 ? 'ofertă trimisă' : 'oferte trimise'}
            </span>
            <Button onClick={onSendOffer} className="gap-2">
              <Send className="h-4 w-4" />
              Trimite Ofertă
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
