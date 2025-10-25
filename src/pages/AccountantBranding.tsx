import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUserRole } from '@/hooks/useUserRole';

const AccountantBranding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAccountant, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isLoading: adminLoading } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState('#10b981');

  useEffect(() => {
    // Wait for subscription and admin data to load before redirecting
    if (subscriptionLoading || adminLoading) return;
    
    // Allow access for admins OR accountants
    if (!isAdmin && !isAccountant) {
      toast({
        title: "Acces restricționat",
        description: "Personalizarea brandului este disponibilă doar pentru conturi Contabil.",
        variant: "destructive"
      });
      navigate('/subscription');
      return;
    }
    fetchBranding();
  }, [isAccountant, isAdmin, subscriptionLoading, adminLoading, navigate, toast]);

  const fetchBranding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Get first company managed by this accountant to get branding settings
        const { data: company } = await supabase
          .from('companies')
          .select('accountant_logo_url, accountant_brand_color')
          .eq('managed_by_accountant_id', user.id)
          .limit(1)
          .maybeSingle();

        if (company) {
          setLogoUrl(company.accountant_logo_url);
          if (company.accountant_brand_color) {
            setBrandColor(company.accountant_brand_color);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Eroare',
        description: 'Te rugăm să încarci o imagine',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Eroare',
        description: 'Imaginea este prea mare (max 2MB)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-logo.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('balance-attachments')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('balance-attachments')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);

      toast({
        title: 'Succes',
        description: 'Logo-ul a fost încărcat cu succes',
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut încărca logo-ul',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all companies managed by this accountant
      const { error } = await supabase
        .from('companies')
        .update({
          accountant_logo_url: logoUrl,
          accountant_brand_color: brandColor,
        })
        .eq('managed_by_accountant_id', user.id);

      if (error) throw error;

      toast({
        title: 'Salvat cu succes',
        description: 'Setările de branding au fost actualizate',
      });
    } catch (error: any) {
      console.error('Error saving branding:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-au putut salva setările',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking subscription and admin status
  if (subscriptionLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se verifică accesul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/yanacrm')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Înapoi
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Branding Personalizat</h1>
              <p className="text-muted-foreground">Personalizează rapoartele pentru clienți</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logo Firmă</CardTitle>
            <CardDescription>
              Logo-ul va apărea pe toate rapoartele trimise către clienți
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="h-32 w-32 border-2 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                  <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <Label htmlFor="logo">Încarcă Logo (max 2MB)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Se încarcă...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Culoare Brand</CardTitle>
            <CardDescription>
              Alege culoarea principală care va apărea în rapoarte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-lg border-2"
                style={{ backgroundColor: brandColor }}
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="color">Culoare (Hex)</Label>
                <Input
                  id="color"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previzualizare</CardTitle>
            <CardDescription>Cum vor arăta rapoartele tale</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 rounded-lg p-6 bg-white space-y-4">
              <div className="flex items-center justify-between pb-4 border-b-2" style={{ borderColor: brandColor }}>
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
                )}
                <div className="text-right">
                  <h3 className="font-bold text-lg" style={{ color: brandColor }}>
                    Raport Financiar
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString('ro-RO')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Acesta este un exemplu de cum va arăta raportul tău personalizat.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/yanacrm')}>
            Anulează
          </Button>
          <Button onClick={handleSaveBranding} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="mr-2 h-4 w-4" />
            Salvează Setările
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountantBranding;
