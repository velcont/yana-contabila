import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowCalendarView } from "./WorkflowCalendarView";
import { WorkflowTemplateManager } from "./WorkflowTemplateManager";
import { WorkflowTeamManager } from "./WorkflowTeamManager";
import { Calendar, FileText, Users } from "lucide-react";

export const MonthlyWorkflowManager = () => {
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📅 Dosare Lunare</h2>
          <p className="text-muted-foreground mt-1">
            Urmărește progresul lunar pentru fiecare companie și gestionează echipa ta
          </p>
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
          <WorkflowCalendarView />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplateManager />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <WorkflowTeamManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
