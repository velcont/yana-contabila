import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyManager } from "@/components/CompanyManager";
import { EmailBroadcast } from "@/components/EmailBroadcast";
import { UsersList } from "@/components/UsersList";
import { CRMManualClientDialog } from "@/components/CRMManualClientDialog";
import { CRMCSVImport } from "@/components/CRMCSVImport";
import { MonthlyWorkflowManager } from "@/components/yanacrm/MonthlyWorkflowManager";
import { Loader2, Building2, Mail, Users, UserPlus, FileUp } from "lucide-react";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const CRM = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { subscriptionType, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [manualClientDialogOpen, setManualClientDialogOpen] = useState(false);
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    console.log('[CRM] Auth state:', { authLoading, user: user?.email });
    console.log('[CRM] Role state:', { roleLoading, isAdmin });
    console.log('[CRM] Subscription state:', { subscriptionLoading, subscriptionType });
  }, [authLoading, user, roleLoading, isAdmin, subscriptionLoading, subscriptionType]);

  // Render content based on state
  const renderContent = () => {
    // Show loading only while checking auth initially
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    // Don't wait for role/subscription if still loading - show access check
    const hasAccess = isAdmin || subscriptionType === 'accounting_firm';
    console.log('[CRM] Access check:', { isAdmin, subscriptionType, hasAccess, roleLoading, subscriptionLoading });

    if (!roleLoading && !subscriptionLoading && !hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md p-8 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-4">Acces Restricționat</h1>
            <p className="text-muted-foreground mb-6">
              Modulul <strong>CRM</strong> este disponibil EXCLUSIV pentru firme de contabilitate cu <strong>Planul Contabil</strong> activ (199 lei/lună).
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Acest modul include: gestionare clienți nelimitați, management documente, calendar termene fiscale, task management, email marketing integrat și branding personalizat.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate("/subscription")} size="lg">
                Activează Planul Contabil
              </Button>
              <Button variant="outline" onClick={() => navigate("/app")}>
                Înapoi la Dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">CRM - Gestionare Clienți</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setCsvImportDialogOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setManualClientDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adaugă Client Manual
            </Button>
            <SubscriptionBadge />
          </div>
        </div>
        
        <Tabs defaultValue="clients" className="space-y-6">
        <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Clienți
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utilizatori
              </TabsTrigger>
              <TabsTrigger value="workflows" className="flex items-center gap-2">
                📅 Dosare Lunare
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="clients">
            <CompanyManager key={refreshKey} />
          </TabsContent>

          <TabsContent value="users">
            <UsersList />
          </TabsContent>

          <TabsContent value="workflows">
            <MonthlyWorkflowManager />
          </TabsContent>

          <TabsContent value="broadcast">
            <EmailBroadcast />
          </TabsContent>
        </Tabs>

        <CRMManualClientDialog
          open={manualClientDialogOpen}
          onOpenChange={setManualClientDialogOpen}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
        
        <CRMCSVImport
          open={csvImportDialogOpen}
          onOpenChange={setCsvImportDialogOpen}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
      </div>
    );
  };

  return renderContent();
};

export default CRM;
