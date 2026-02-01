import './App.css';
import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider as AppThemeProvider } from "@/contexts/ThemeContext";
import { ThemeRoleProvider } from "@/contexts/ThemeRoleContext";
import { TutorialMenu } from "@/components/TutorialMenu";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { VersionUpdateBanner } from "@/components/VersionUpdateBanner";
import { NotificationProvider } from "@/components/NotificationSystem";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { checkForNewVersion, performVersionRefresh, saveCurrentVersion } from "@/utils/versionRefresh";
import { usePresenceTracking } from "@/hooks/usePresenceTracking";
import { useVersionUpdateToast } from "@/hooks/useVersionUpdateToast";

// Lazy load all route components for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Contact = lazy(() => import("./pages/Contact"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Admin = lazy(() => import("./pages/Admin"));
const UpdatesManager = lazy(() => import("./pages/UpdatesManager"));
const MarketingMaterials = lazy(() => import("./pages/MarketingMaterials"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Landing = lazy(() => import("./pages/Landing"));
const Demo = lazy(() => import("./pages/Demo"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const PlatformCosts = lazy(() => import("./pages/PlatformCosts"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Pricing = lazy(() => import("./pages/Pricing"));

const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const StrategicAdvisor = lazy(() => import("./pages/StrategicAdvisor"));
const Settings = lazy(() => import("./pages/Settings"));
const Yana = lazy(() => import("./pages/Yana"));

const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const GenerateLiteratureReview = lazy(() => import("./pages/GenerateLiteratureReview"));
const GenerateConferencePaper = lazy(() => import("./pages/GenerateConferencePaper"));
const MyDocuments = lazy(() => import("./pages/MyDocuments"));
const GenerateAcademicStatistics = lazy(() => import("./pages/GenerateAcademicStatistics"));
const MyAICosts = lazy(() => import("./pages/MyAICosts"));

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={`/auth?redirect=${location.pathname}`} replace />;
  }
  
  return children;
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

// Wrapper pentru presence tracking - trebuie să fie în BrowserRouter
const PresenceTracker = () => {
  usePresenceTracking();
  return null;
};

// Wrapper pentru toast update - trebuie să fie în context providers
const VersionUpdateToast = () => {
  useVersionUpdateToast();
  return null;
};

const App = () => {
  // Verificare inactivitate >24h la încărcarea aplicației
  useEffect(() => {
    const checkInactivity = async () => {
      const lastActiveTime = localStorage.getItem('lastActiveTime');
      const now = Date.now();
      
      if (lastActiveTime) {
        const hoursSinceLastActivity = (now - parseInt(lastActiveTime)) / (1000 * 60 * 60);
        
        // Dacă au trecut >24h de la ultima activitate, verificăm versiunea
        if (hoursSinceLastActivity > 24) {
          const hasNewVersion = await checkForNewVersion(supabase);
          if (hasNewVersion) {
            await saveCurrentVersion(supabase);
            await performVersionRefresh();
            return; // Nu ajunge aici, pagina se reîncarcă
          }
        }
      }
      
      // Salvăm timpul curent ca ultimă activitate
      localStorage.setItem('lastActiveTime', now.toString());
    };
    
    checkInactivity();
    
    // Update lastActiveTime la fiecare 5 minute de activitate
    const activityInterval = setInterval(() => {
      localStorage.setItem('lastActiveTime', Date.now().toString());
    }, 5 * 60 * 1000); // 5 minute
    
    return () => clearInterval(activityInterval);
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <VersionUpdateBanner />
          <BrowserRouter>
          <ErrorBoundary>
            <SubscriptionProvider>
              <ThemeRoleProvider>
                <AppThemeProvider>
                  <NotificationProvider>
                    <TutorialProvider>
                    <PresenceTracker />
                    <VersionUpdateToast />
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/landing" element={<Landing />} />
                      <Route path="/demo" element={<Demo />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
                      <Route path="/admin/platform-costs" element={<PrivateRoute><PlatformCosts /></PrivateRoute>} />
                      <Route path="/marketing-materials" element={<PrivateRoute><MarketingMaterials /></PrivateRoute>} />
                      <Route path="/updates" element={<PrivateRoute><UpdatesManager /></PrivateRoute>} />
                      <Route path="/system-health" element={<PrivateRoute><SystemHealth /></PrivateRoute>} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/pricing" element={<Pricing />} />
                      
                      <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />
                      <Route path="/subscription-success" element={<PrivateRoute><SubscriptionSuccess /></PrivateRoute>} />
                      <Route path="/accept-invitation" element={<AcceptInvitation />} />
                      <Route path="/strategic-advisor" element={<Navigate to="/yana" replace />} />
                      <Route path="/yana" element={<PrivateRoute><Yana /></PrivateRoute>} />
                      
                      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                      <Route path="/app" element={<Navigate to="/yana" replace />} />
                      
                      <Route path="/generate-literature-review" element={<GenerateLiteratureReview />} />
                      <Route path="/generate-conference-paper" element={<GenerateConferencePaper />} />
                      <Route path="/generate-academic-statistics" element={<PrivateRoute><GenerateAcademicStatistics /></PrivateRoute>} />
                      <Route path="/my-documents" element={<PrivateRoute><MyDocuments /></PrivateRoute>} />
                      <Route path="/my-ai-costs" element={<PrivateRoute><MyAICosts /></PrivateRoute>} />
                      
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
          </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;