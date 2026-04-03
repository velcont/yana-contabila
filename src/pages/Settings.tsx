import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Bell, Shield, CreditCard, Brain, LogOut, RefreshCw } from 'lucide-react';
import { AccountDeletion } from '@/components/AccountDeletion';
import { useAuth } from '@/hooks/useAuth';
import { YanaHomeButton } from '@/components/YanaHomeButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MiniFooter from '@/components/MiniFooter';
import { AILearningDashboard } from '@/components/AILearningDashboard';
import { YanaMemoryInsights } from '@/components/yana/YanaMemoryInsights';
import { SubscriptionDetails } from '@/components/settings/SubscriptionDetails';
import { useToast } from '@/hooks/use-toast';
import { performVersionRefresh } from '@/utils/versionRefresh';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Eroare la deconectare",
        description: "Nu am putut să te deconectez. Încearcă din nou.",
        variant: "destructive"
      });
    }
  };

  const handleForceRefresh = async () => {
    toast({
      title: "Se actualizează...",
      description: "Se curăță cache-ul și se reîncarcă aplicația.",
    });
    await performVersionRefresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <YanaHomeButton />
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Deconectare</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmare deconectare</AlertDialogTitle>
                <AlertDialogDescription>
                  Sigur vrei să te deconectezi din contul tău YANA?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anulează</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut}>Deconectează-mă</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold">Setări Cont</h1>
          <p className="text-muted-foreground">
            Gestionează-ți contul și preferințele
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TooltipProvider>
            <TabsList className="flex w-full overflow-x-auto gap-1 p-1 no-scrollbar sm:grid sm:grid-cols-5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="profile" className="flex-shrink-0 gap-1.5 px-3 min-w-[44px]">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profil</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Profil</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="notifications" className="flex-shrink-0 gap-1.5 px-3 min-w-[44px]">
                    <Bell className="h-4 w-4" />
                    <span className="hidden sm:inline">Notificări</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Notificări</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="billing" className="flex-shrink-0 gap-1.5 px-3 min-w-[44px]">
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden sm:inline">Abonament</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Abonament</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="ai-learning" className="flex-shrink-0 gap-1.5 px-3 min-w-[44px]">
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Learning</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">AI Learning</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="security" className="flex-shrink-0 gap-1.5 px-3 min-w-[44px]">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Securitate</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Securitate</TooltipContent>
              </Tooltip>
            </TabsList>
          </TooltipProvider>

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

            <Card>
              <CardHeader>
                <CardTitle>Actualizare Aplicație</CardTitle>
                <CardDescription>
                  Curăță cache-ul browserului pentru a vedea cele mai noi modificări
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleForceRefresh}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizează aplicația
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <SubscriptionDetails />
          </TabsContent>

          <TabsContent value="ai-learning" className="space-y-6">
            <YanaMemoryInsights />
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
      <MiniFooter />
    </div>
  );
};

export default Settings;
