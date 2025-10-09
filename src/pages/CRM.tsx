import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyManager } from "@/components/CompanyManager";
import { EmailBroadcast } from "@/components/EmailBroadcast";
import { Loader2, Building2, Mail } from "lucide-react";

const CRM = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acces Restricționat</h1>
          <p className="text-muted-foreground">
            Doar administratorii pot accesa această pagină.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Firme
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Broadcast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CompanyManager />
        </TabsContent>

        <TabsContent value="broadcast">
          <EmailBroadcast />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRM;
