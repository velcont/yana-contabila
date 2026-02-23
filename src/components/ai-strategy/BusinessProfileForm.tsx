import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { INDUSTRIES, DEPARTMENTS, type BusinessProfile } from '@/config/aiStrategyData';
import { Building2, Users, TrendingUp, Briefcase } from 'lucide-react';

interface BusinessProfileFormProps {
  onSubmit: (profile: BusinessProfile) => void;
  isLoading: boolean;
}

export function BusinessProfileForm({ onSubmit, isLoading }: BusinessProfileFormProps) {
  const [industry, setIndustry] = useState('');
  const [employeesCount, setEmployeesCount] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [netProfit, setNetProfit] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [businessDescription, setBusinessDescription] = useState('');

  const toggleDepartment = (value: string) => {
    setDepartments(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !employeesCount || !annualRevenue) return;
    onSubmit({
      industry,
      employeesCount: parseInt(employeesCount),
      annualRevenue: parseFloat(annualRevenue),
      netProfit: parseFloat(netProfit) || 0,
      departments,
      businessDescription,
    });
  };

  const isValid = industry && employeesCount && annualRevenue;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Profilul Afacerii
          </CardTitle>
          <CardDescription>
            Completează informațiile despre afacerea ta pentru o analiză personalizată
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industria / Domeniul *</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează industria" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employees" className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Număr angajați *
              </Label>
              <Input
                id="employees"
                type="number"
                min={1}
                value={employeesCount}
                onChange={e => setEmployeesCount(e.target.value)}
                placeholder="ex: 25"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue" className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Cifra de afaceri anuală (RON) *
              </Label>
              <Input
                id="revenue"
                type="number"
                min={0}
                value={annualRevenue}
                onChange={e => setAnnualRevenue(e.target.value)}
                placeholder="ex: 2000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit">Profit net anual (RON)</Label>
              <Input
                id="profit"
                type="number"
                value={netProfit}
                onChange={e => setNetProfit(e.target.value)}
                placeholder="ex: 300000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Departamente principale
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DEPARTMENTS.map(dep => (
                <div key={dep.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`dep-${dep.value}`}
                    checked={departments.includes(dep.value)}
                    onCheckedChange={() => toggleDepartment(dep.value)}
                  />
                  <Label htmlFor={`dep-${dep.value}`} className="text-sm font-normal cursor-pointer">
                    {dep.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descriere activitate (max 500 caractere)
            </Label>
            <Textarea
              id="description"
              value={businessDescription}
              onChange={e => setBusinessDescription(e.target.value.slice(0, 500))}
              placeholder="Descrie pe scurt activitatea firmei, tipul de clienți, provocările principale..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {businessDescription.length}/500
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={!isValid || isLoading}>
        {isLoading ? 'Se analizează afacerea...' : '🚀 Analizează cu YANA AI'}
      </Button>
    </form>
  );
}
