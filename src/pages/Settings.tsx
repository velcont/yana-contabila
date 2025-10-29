import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Bell, Shield, CreditCard, Brain } from 'lucide-react';
import { AccountDeletion } from '@/components/AccountDeletion';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Footer } from '@/components/Footer';
import { AILearningDashboard } from '@/components/AILearningDashboard';

export const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Înapoi
          </Button>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold">Setări Cont</h1>
          <p className="text-muted-foreground">
            Gestionează-ți contul și preferințele
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificări
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Abonament
            </TabsTrigger>
            <TabsTrigger value="ai-learning" className="gap-2">
              <Brain className="h-4 w-4" />
              AI Learning
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Securitate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informații Profil</CardTitle>
                <CardDescription>
                  Datele tale personale
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">ID Utilizator</label>
                  <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferințe Notificări</CardTitle>
                <CardDescription>
                  Alege ce notificări vrei să primești
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Setările de notificări vor fi disponibile în curând.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Abonament și Facturare</CardTitle>
                <CardDescription>
                  Gestionează abonamentul și metodele de plată
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => navigate('/subscription')}>
                  Vezi detalii abonament
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-learning" className="space-y-6">
            <AILearningDashboard />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Securitate Cont</CardTitle>
                <CardDescription>
                  Setări de securitate și autentificare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Opțiunile de securitate vor fi disponibile în curând.
                </p>
              </CardContent>
            </Card>

            <AccountDeletion />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};
