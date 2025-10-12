import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  company_name: string;
  subscription_status: string;
  trial_ends_at: string | null;
  is_active: boolean;
}

interface CompanySwitcherProps {
  currentCompanyId: string | null;
  onCompanyChange: (companyId: string) => void;
  onAddCompany: () => void;
}

export const CompanySwitcher = ({ currentCompanyId, onCompanyChange, onAddCompany }: CompanySwitcherProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, subscription_status, trial_ends_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca firmele.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const currentCompany = companies.find(c => c.id === currentCompanyId);

  const getSubscriptionBadge = (company: Company) => {
    const isInTrial = company.trial_ends_at && new Date(company.trial_ends_at) > new Date();
    
    if (company.subscription_status === 'active') {
      return <Badge variant="default" className="ml-2 bg-green-500">Activ</Badge>;
    } else if (isInTrial) {
      return <Badge variant="secondary" className="ml-2">Trial</Badge>;
    } else {
      return <Badge variant="destructive" className="ml-2">Inactiv</Badge>;
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Building2 className="h-4 w-4 mr-2" />
        Se încarcă...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[200px] truncate">
            {currentCompany?.company_name || 'Selectează firma'}
          </span>
          {currentCompany && getSubscriptionBadge(currentCompany)}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <DropdownMenuLabel>Firmele mele</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => onCompanyChange(company.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              {currentCompanyId === company.id && <Check className="h-4 w-4" />}
              <span className="truncate">{company.company_name}</span>
            </div>
            {getSubscriptionBadge(company)}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddCompany} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Adaugă firmă nouă
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
