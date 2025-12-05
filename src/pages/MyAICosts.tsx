import { AIUsageDashboard } from "@/components/AIUsageDashboard";

const MyAICosts = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <AIUsageDashboard />
      </div>
    </div>
  );
};

export default MyAICosts;
