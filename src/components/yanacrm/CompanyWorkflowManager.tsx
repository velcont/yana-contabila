import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkflowCalendarView } from "./WorkflowCalendarView";
import { WorkflowTemplateManager } from "./WorkflowTemplateManager";
import { WorkflowTeamManager } from "./WorkflowTeamManager";
import { Calendar, FileText, Users, Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export const CompanyWorkflowManager = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  // Fetch companies pentru dropdown
  const { data: companies } = useQuery({
    queryKey: ["accountant-companies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("managed_by_accountant_id", user!.id)
        .order("company_name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">📅 Dosare Lunare</h2>
          <p className="text-muted-foreground mt-1">
            Urmărește progresul lunar pentru fiecare companie și gestionează echipa ta
          </p>
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-2 min-w-[250px]">
          <Label htmlFor="company-select" className="flex items-center gap-2 whitespace-nowrap">
            <Building2 className="h-4 w-4" />
            Companie:
          </Label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger id="company-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏢 Toate companiile</SelectItem>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar Lunar
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Șabloane Workflow
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Echipa Mea
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <WorkflowCalendarView selectedCompanyId={selectedCompanyId} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplateManager />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <WorkflowTeamManager selectedCompanyId={selectedCompanyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};