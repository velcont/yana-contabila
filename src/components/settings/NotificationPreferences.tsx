import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sun, Moon, MapPin, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [city, setCity] = useState('București');

  useEffect(() => {
    if (!user?.id) return;
    
    const loadPreferences = async () => {
      try {
        const { data } = await supabase
          .from('yana_client_profiles')
          .select('morning_briefing_enabled, evening_debrief_enabled, city')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setMorningEnabled(data.morning_briefing_enabled ?? true);
          setEveningEnabled(data.evening_debrief_enabled ?? true);
          setCity(data.city || 'București');
        }
      } catch (err) {
        console.error('Error loading notification preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('yana_client_profiles')
        .upsert({
          user_id: user.id,
          morning_briefing_enabled: morningEnabled,
          evening_debrief_enabled: eveningEnabled,
          city: city.trim() || 'București',
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Preferințe salvate",
        description: "Setările de notificări au fost actualizate cu succes.",
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast({
        title: "Eroare",
        description: "Nu am putut salva preferințele. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Briefing de Dimineață
          </CardTitle>
          <CardDescription>
            Email zilnic la ora 7:00 cu agenda zilei, termene fiscale, acțiuni restante și vreme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="morning-briefing" className="cursor-pointer">
              Primesc briefing-ul de dimineață
            </Label>
            <Switch
              id="morning-briefing"
              checked={morningEnabled}
              onCheckedChange={setMorningEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-500" />
            Rezumat de Seară
          </CardTitle>
          <CardDescription>
            Email zilnic la ora 18:00 cu ce s-a rezolvat azi, ce rămâne pe mâine și recomandare de relaxare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="evening-debrief" className="cursor-pointer">
              Primesc rezumatul de seară
            </Label>
            <Switch
              id="evening-debrief"
              checked={eveningEnabled}
              onCheckedChange={setEveningEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-500" />
            Oraș pentru Meteo
          </CardTitle>
          <CardDescription>
            YANA include vremea din orașul tău în briefing-ul de dimineață.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="city">Orașul tău</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: București, Cluj-Napoca, Timișoara"
            />
            <p className="text-xs text-muted-foreground">
              Orașe suportate: București, Cluj-Napoca, Timișoara, Iași, Constanța, Craiova, Brașov, Galați, Ploiești, Oradea, Sibiu, Arad, Pitești, Bacău, Târgu Mureș, Baia Mare, Buzău, Suceava.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvează preferințele
      </Button>
    </div>
  );
};
