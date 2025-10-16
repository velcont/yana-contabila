import { AIUsageDashboard } from '@/components/AIUsageDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyAICosts = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Înapoi
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Costurile Mele AI</h1>
          <p className="text-muted-foreground">
            Vezi consumul tău de credite AI, gestionează bugetul și cumpără credite suplimentare
          </p>
        </div>

        <AIUsageDashboard />
      </div>
    </div>
  );
};

export default MyAICosts;
