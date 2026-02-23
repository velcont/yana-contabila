import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Loader2 } from 'lucide-react';
import { INDUSTRIES, DEPARTMENTS, type BusinessProfile } from '@/config/aiStrategyData';

interface AIStrategyFormArtifactProps {
  onSubmit: (profile: BusinessProfile) => void;
  isLoading?: boolean;
  isSubmitted?: boolean;
}

export function AIStrategyFormArtifact({ onSubmit, isLoading, isSubmitted }: AIStrategyFormArtifactProps) {
  const [profile, setProfile] = useState<BusinessProfile>({
    industry: '',
    employeesCount: 0,
    annualRevenue: 0,
    netProfit: 0,
    departments: [],
    businessDescription: '',
  });

  const handleDepartmentToggle = (dept: string) => {
    setProfile(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const isValid = profile.industry && profile.employeesCount > 0 && profile.annualRevenue > 0;

  if (isSubmitted) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Formularul a fost trimis. Rezultatele sunt mai jos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/80 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Transformare Digitală cu AI — Profil Afacere
        </CardTitle>
        <p className="text-xs text-muted-foreground">Completează datele afacerii pentru o analiză personalizată</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Industrie *</Label>
            <Select value={profile.industry} onValueChange={v => setProfile(p => ({ ...p, industry: v }))}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selectează..." />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nr. angajați *</Label>
            <Input
              type="number"
              min={1}
              className="h-9 text-xs"
              value={profile.employeesCount || ''}
              onChange={e => setProfile(p => ({ ...p, employeesCount: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">CA anuală (RON) *</Label>
            <Input
              type="number"
              min={0}
              className="h-9 text-xs"
              value={profile.annualRevenue || ''}
              onChange={e => setProfile(p => ({ ...p, annualRevenue: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Profit net (RON)</Label>
            <Input
              type="number"
              className="h-9 text-xs"
              value={profile.netProfit || ''}
              onChange={e => setProfile(p => ({ ...p, netProfit: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Departamente</Label>
          <div className="flex flex-wrap gap-3">
            {DEPARTMENTS.map(d => (
              <label key={d.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={profile.departments.includes(d.value)}
                  onCheckedChange={() => handleDepartmentToggle(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Descriere activitate</Label>
          <Textarea
            className="text-xs min-h-[60px] resize-none"
            maxLength={500}
            placeholder="Descrie pe scurt activitatea firmei..."
            value={profile.businessDescription}
            onChange={e => setProfile(p => ({ ...p, businessDescription: e.target.value }))}
          />
        </div>

        <Button
          className="w-full"
          disabled={!isValid || isLoading}
          onClick={() => onSubmit(profile)}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analizez cu YANA...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analizează cu YANA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
