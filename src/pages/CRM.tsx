import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMManualClientDialog } from "@/components/CRMManualClientDialog";
import { CRMCSVImport } from "@/components/CRMCSVImport";
import { Loader2, Building2, Mail, Users, UserPlus, FileUp, FileCheck } from "lucide-react";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { ContextualHelp } from "@/components/ContextualHelp";
import { CRMProvider } from "@/contexts/CRMContext";

// Lazy load CRM components
const CompanyManager = lazy(() => import("@/components/CompanyManager").then(m => ({ default: m.CompanyManager })));
const EmailBroadcast = lazy(() => import("@/components/EmailBroadcast").then(m => ({ default: m.EmailBroadcast })));
const UsersList = lazy(() => import("@/components/UsersList").then(m => ({ default: m.UsersList })));
const MonthlyWorkflowManager = lazy(() => import("@/components/yanacrm/MonthlyWorkflowManager").then(m => ({ default: m.MonthlyWorkflowManager })));
const BalanceConfirmationHistory = lazy(() => import("@/components/BalanceConfirmationHistory").then(m => ({ default: m.BalanceConfirmationHistory })));

const TabContentLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" />
  </div>
);

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
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    // Don't wait for role/subscription if still loading - show access check
    const hasAccess = isAdmin || subscriptionType === 'accounting_firm';
    console.log('[CRM] Access check:', { isAdmin, subscriptionType, hasAccess, roleLoading, subscriptionLoading });

    if (!roleLoading && !subscriptionLoading && !hasAccess) {
      navigate("/app");
      return null;
    }

    return (
      <CRMProvider>
        <div className="container mx-auto py-8 px-4 animate-appear">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">CRM - Gestionare Clienți</h1>
              <ContextualHelp
                title="Modul CRM"
                content="Gestionează clienții firmei tale de contabilitate. Adaugă clienți manual sau importă din CSV, gestionează utilizatori, workflows lunare și comunică prin email."
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setCsvImportDialogOpen(true)} className="btn-hover-lift">
                <FileUp className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={() => setManualClientDialogOpen(true)} className="btn-hover-lift">
                <UserPlus className="mr-2 h-4 w-4" />
                Adaugă Client Manual
              </Button>
              <SubscriptionBadge />
            </div>
          </div>
          
          <Tabs defaultValue="clients" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <TabsList className="grid w-full max-w-3xl grid-cols-5">
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
                  <TabsTrigger value="balance" className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Istoric Confirmări
                  </TabsTrigger>
                </TabsList>
              </div>

            <TabsContent value="clients">
              <Suspense fallback={<TabContentLoader />}>
                <CompanyManager key={refreshKey} />
              </Suspense>
            </TabsContent>

            <TabsContent value="users">
              <Suspense fallback={<TabContentLoader />}>
                <UsersList />
              </Suspense>
            </TabsContent>

            <TabsContent value="workflows">
              <Suspense fallback={<TabContentLoader />}>
                <MonthlyWorkflowManager />
              </Suspense>
            </TabsContent>

            <TabsContent value="broadcast">
              <Suspense fallback={<TabContentLoader />}>
                <EmailBroadcast />
              </Suspense>
            </TabsContent>

            <TabsContent value="balance">
              <Suspense fallback={<TabContentLoader />}>
                <BalanceConfirmationHistory />
              </Suspense>
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
      </CRMProvider>
    );
  };

  return renderContent();
};

export default CRM;
