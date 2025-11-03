import './App.css';
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider as AppThemeProvider } from "@/contexts/ThemeContext";
import { ThemeRoleProvider } from "@/contexts/ThemeRoleContext";
import { TutorialMenu } from "@/components/TutorialMenu";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { UpdateNotificationBanner } from "@/components/UpdateNotificationBanner";
import { NotificationProvider } from "@/components/NotificationSystem";

// Lazy load all route components for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Contact = lazy(() => import("./pages/Contact"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const Admin = lazy(() => import("./pages/Admin"));
const UpdatesManager = lazy(() => import("./pages/UpdatesManager"));
const CRM = lazy(() => import("./pages/CRM"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Landing = lazy(() => import("./pages/Landing"));
const Demo = lazy(() => import("./pages/Demo"));
const IndustryDemos = lazy(() => import("./pages/IndustryDemos"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const PlatformCosts = lazy(() => import("./pages/PlatformCosts"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Pricing = lazy(() => import("./pages/Pricing"));
const MyAICosts = lazy(() => import("./pages/MyAICosts"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const AccountantBranding = lazy(() => import("./pages/AccountantBranding"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const StrategicAdvisor = lazy(() => import("./pages/StrategicAdvisor"));
const HumanizeText = lazy(() => import("./pages/HumanizeText"));
const ClientOnboardingWizard = lazy(() => import("./pages/ClientOnboardingWizard"));
const Settings = lazy(() => import("./pages/Settings"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const GenerateCFOPresentation = lazy(() => import("./pages/GenerateCFOPresentation"));
const GenerateLiteratureReview = lazy(() => import("./pages/GenerateLiteratureReview"));

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return <Landing />;
  }
  return children;
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateNotificationBanner />
        <BrowserRouter>
          <SubscriptionProvider>
            <ThemeRoleProvider>
              <AppThemeProvider>
                <NotificationProvider>
                  <TutorialProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/landing" element={<Landing />} />
                      <Route path="/demo" element={<Demo />} />
                      <Route path="/industry-demos" element={<PrivateRoute><IndustryDemos /></PrivateRoute>} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                      <Route path="/advanced-analytics" element={<PrivateRoute><AdvancedAnalytics /></PrivateRoute>} />
                      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
                      <Route path="/admin/platform-costs" element={<PrivateRoute><PlatformCosts /></PrivateRoute>} />
                      <Route path="/updates" element={<PrivateRoute><UpdatesManager /></PrivateRoute>} />
                      <Route path="/crm" element={<PrivateRoute><CRM /></PrivateRoute>} />
                      <Route path="/system-health" element={<PrivateRoute><SystemHealth /></PrivateRoute>} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/my-ai-costs" element={<PrivateRoute><MyAICosts /></PrivateRoute>} />
                      <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />
                      <Route path="/subscription-success" element={<PrivateRoute><SubscriptionSuccess /></PrivateRoute>} />
                      <Route path="/yanacrm" element={<PrivateRoute><AccountantDashboard /></PrivateRoute>} />
                      <Route path="/accountant-branding" element={<PrivateRoute><AccountantBranding /></PrivateRoute>} />
                      <Route path="/accept-invitation" element={<AcceptInvitation />} />
                      <Route path="/client-onboarding/:processId" element={<ClientOnboardingWizard />} />
                      <Route path="/strategic-advisor" element={<PrivateRoute><StrategicAdvisor /></PrivateRoute>} />
                      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                      <Route path="/app" element={<PrivateRoute><Index /></PrivateRoute>} />
                      <Route path="/humanize-text" element={<PrivateRoute><HumanizeText /></PrivateRoute>} />
                      <Route path="/generate-cfo-presentation" element={<GenerateCFOPresentation />} />
                      <Route path="/generate-literature-review" element={<GenerateLiteratureReview />} />
                      <Route path="/install" element={<InstallPWA />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                    <TutorialMenu />
                  </TutorialProvider>
                </NotificationProvider>
              </AppThemeProvider>
            </ThemeRoleProvider>
          </SubscriptionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
