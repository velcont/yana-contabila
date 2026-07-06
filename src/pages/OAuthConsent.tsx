import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SupabaseAuthWithOAuth = typeof supabase.auth & {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
    approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
    denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  };
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?redirect=" + encodeURIComponent(next);
        return;
      }
      const oauth = (supabase.auth as SupabaseAuthWithOAuth).oauth;
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = (supabase.auth as SupabaseAuthWithOAuth).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-3">
          <h1 className="text-2xl font-semibold">Autorizare eșuată</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Se încarcă…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "această aplicație";
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="max-w-md w-full space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            Conectează {clientName} la YANA
          </h1>
          <p className="text-sm text-muted-foreground">
            {clientName} va putea folosi uneltele YANA (conversații, task-uri, CRM) în numele
            tău. Aprobă doar dacă recunoști aplicația.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Refuză
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Aprobă
          </button>
        </div>
      </div>
    </main>
  );
}