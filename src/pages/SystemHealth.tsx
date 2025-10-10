import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import HealthStatus from '@/components/HealthStatus';
import { AIUsageDashboard } from '@/components/AIUsageDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

const SystemHealth = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Acces Restricționat</CardTitle>
            </div>
            <CardDescription>
              Această pagină este disponibilă doar pentru administratori.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Monitorizare Sistem</h1>
        <p className="text-muted-foreground mt-2">
          Verifică starea serviciilor, componentelor și costurilor AI
        </p>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="health">Status Servicii</TabsTrigger>
          <TabsTrigger value="ai-costs">Costuri AI</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <HealthStatus />

        <Card>
          <CardHeader>
            <CardTitle>Despre Monitorizare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Ce se monitorizează?</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Database:</strong> Conexiune la baza de date și timpul de răspuns</li>
                <li><strong>Auth:</strong> Serviciul de autentificare</li>
                <li><strong>Storage:</strong> Serviciul de stocare fișiere</li>
                <li><strong>OpenAI API:</strong> Disponibilitatea API-ului pentru AI</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Statusuri:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-green-500">Healthy:</strong> Serviciul funcționează normal</li>
                <li><strong className="text-yellow-500">Degraded:</strong> Serviciul funcționează dar cu performanță redusă</li>
                <li><strong className="text-red-500">Down:</strong> Serviciul nu este disponibil</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                💡 <strong>Tip:</strong> Health check-urile se actualizează automat la fiecare 5 minute.
                Poți forța o verificare manuală apăsând pe butonul "Verifică Acum".
              </p>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="ai-costs">
          <AIUsageDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealth;
