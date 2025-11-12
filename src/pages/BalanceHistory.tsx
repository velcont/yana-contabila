import { BalanceConfirmationHistory } from "@/components/BalanceConfirmationHistory";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function BalanceHistory() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Istoric Confirmări Balanță</h1>
        <p className="text-muted-foreground mt-2">
          Toate confirmările de balanță generate din Chat AI
        </p>
      </div>
      <BalanceConfirmationHistory />
    </div>
  );
}
