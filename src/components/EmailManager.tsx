import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Settings, Send, FileText } from "lucide-react";
import { EmailConfigManager } from "./EmailConfigManager";
import { EmailBroadcast } from "./EmailBroadcast";
import { EmailTemplatesManager } from "./EmailTemplatesManager";

export const EmailManager = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Sistem Email
        </h2>
        <p className="text-muted-foreground mt-1">
          Configurare, template-uri și trimitere email-uri către clienți
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configurare SMTP
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Template-uri
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Send className="mr-2 h-4 w-4" />
            Trimite Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <EmailConfigManager />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplatesManager />
        </TabsContent>

        <TabsContent value="broadcast">
          <EmailBroadcast />
        </TabsContent>
      </Tabs>
    </div>
  );
};