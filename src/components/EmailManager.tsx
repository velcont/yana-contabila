import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, FileText } from "lucide-react";
import { EmailBroadcast } from "./EmailBroadcast";
import { EmailTemplatesManager } from "./EmailTemplatesManager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check } from "lucide-react";

export const EmailManager = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Sistem Email
        </h2>
        <p className="text-muted-foreground mt-1">
          Template-uri și trimitere email-uri către clienți
        </p>
      </div>

      <Alert className="bg-success/10 border-success text-success-foreground">
        <Check className="h-4 w-4" />
        <AlertDescription>
          <strong>Email simplificat!</strong> Nu mai trebuie să configurați SMTP. 
          Sistemul trimite automat email-uri prin serviciul nostru securizat.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Template-uri
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Send className="mr-2 h-4 w-4" />
            Trimite Email
          </TabsTrigger>
        </TabsList>

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