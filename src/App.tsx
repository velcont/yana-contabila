import './App.css';
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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Contact from "./pages/Contact";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import UpdatesManager from "./pages/UpdatesManager";
import CRM from "./pages/CRM";
import NotFound from "./pages/NotFound";
import { Landing } from "./pages/Landing";
import { Demo } from "./pages/Demo";
import { IndustryDemos } from "./pages/IndustryDemos";
import SystemHealth from "./pages/SystemHealth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";
import MyAICosts from "./pages/MyAICosts";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import AccountantDashboard from "./pages/AccountantDashboard";
import AccountantBranding from "./pages/AccountantBranding";
import AcceptInvitation from "./pages/AcceptInvitation";
import StrategicAdvisor from "./pages/StrategicAdvisor";
import HumanizeText from "./pages/HumanizeText";
import ClientOnboardingWizard from "./pages/ClientOnboardingWizard";
import { Settings } from "./pages/Settings";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { UpdateNotificationBanner } from "@/components/UpdateNotificationBanner";

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
                <TutorialProvider>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/demo" element={<Demo />} />
                    <Route path="/industry-demos" element={<PrivateRoute><IndustryDemos /></PrivateRoute>} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                    <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
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
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <TutorialMenu />
                </TutorialProvider>
              </AppThemeProvider>
            </ThemeRoleProvider>
          </SubscriptionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
