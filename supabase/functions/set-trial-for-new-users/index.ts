import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // This function is called by a trigger when a new user is created
    // It sets the trial period to 30 days from now
    const { userId } = await req.json();

    if (!userId) {
      throw new Error("No userId provided");
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // FAZA 2: Setăm subscription_status = 'trial' pentru utilizatorii noi
    // Aceasta diferențiază clar între trial activ și abonament plătit
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_status: 'trial', // Nu mai setăm 'active' - diferențiere clară
        // Don't set subscription_type - user must choose via AccountTypeSelector
      })
      .eq('id', userId);

    if (error) throw error;

    // 🆕 FAZA 3: Setăm automat bugetul AI pentru trial
    // Acest pas asigură că toți utilizatorii noi au un buget AI setat
    const { error: budgetError } = await supabaseClient
      .from('ai_budget_limits')
      .upsert({
        user_id: userId,
        monthly_budget_cents: 1000,      // 10 RON buget lunar
        trial_credits_cents: 1000,       // 10 RON credite trial
        trial_credits_used_cents: 0,     // 0 folosit
        trial_credits_granted_at: new Date().toISOString(),
        is_active: true
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (budgetError) {
      console.error('Error setting AI budget for trial user:', budgetError);
      // Nu blocăm utilizatorul dacă setarea bugetului eșuează
    } else {
      console.log('AI budget set for trial user:', userId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trial_ends_at: trialEndsAt,
        ai_budget_set: !budgetError
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
