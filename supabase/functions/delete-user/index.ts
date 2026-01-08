import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🔒 VALIDARE INPUT SCHEMA
const DeleteUserInputSchema = z.object({
  userId: z.string()
    .uuid("User ID trebuie să fie un UUID valid")
    .min(1, "User ID lipsește"),
  deletionReason: z.string()
    .max(500, "Motivul ștergerii este prea lung (max 500 caractere)")
    .optional()
});

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

    // Verifică dacă utilizatorul care face request-ul este admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    const rawBody = await req.json();
    
    // 🔒 VALIDARE INPUT CU ZOD
    const validationResult = DeleteUserInputSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error("❌ Input invalid:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Date de intrare invalide", 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const { userId, deletionReason } = validationResult.data;

    // Verifică permisiuni:
    // - Utilizatorul poate să-și șteargă propriul cont
    // - Adminii pot șterge orice cont (altul decât al lor)
    const isSelfDeletion = userId === requestingUser.id;
    
    if (!isSelfDeletion) {
      // Dacă nu e self-deletion, verifică dacă e admin
      const { data: roles, error: roleError } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", requestingUser.id)
        .eq("role", "admin");

      if (roleError || !roles || roles.length === 0) {
        throw new Error("Only admins can delete other users' accounts");
      }
    }

    console.log(`${isSelfDeletion ? 'User' : 'Admin'} ${requestingUser.email} attempting to delete user ${userId}`);

    // Obține informații despre utilizatorul ÎNAINTE de ștergere
    const { data: deletedUserInfo, error: getUserError } = await supabaseClient.auth.admin.getUserById(userId);
    if (getUserError) {
      console.warn("Nu s-au putut obține detaliile utilizatorului:", getUserError);
    }
    const deletedUserEmail = deletedUserInfo?.user?.email || "Unknown";
    const deletedUserName = deletedUserInfo?.user?.user_metadata?.full_name || "";

    // Obține detalii profil
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Salvează în deleted_users pentru audit și conformitate GDPR
    const { error: auditError } = await supabaseClient
      .from("deleted_users")
      .insert({
        original_user_id: userId,
        email: deletedUserEmail,
        full_name: deletedUserName || profileData?.full_name,
        subscription_type: profileData?.subscription_type,
        subscription_status: profileData?.subscription_status,
        deletion_reason: deletionReason || (isSelfDeletion ? "User requested account deletion" : "Admin deletion via dashboard"),
        deleted_by: requestingUser.id,
        deleted_by_email: requestingUser.email,
        user_metadata: deletedUserInfo?.user?.user_metadata || {},
        created_at: profileData?.created_at || new Date().toISOString()
      });

    if (auditError) {
      console.warn("Nu s-a putut salva în deleted_users:", auditError);
      // Continuăm ștergerea chiar dacă audit-ul eșuează
    } else {
      console.log("✅ Utilizator salvat în deleted_users pentru audit");
    }

    // Șterge utilizatorul din auth și curăță manual înregistrările dependente (profiles, user_roles)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    // Extra cleanup în cazul în care FK-urile nu au ON DELETE CASCADE
    const { error: profileDelError } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileDelError && (profileDelError as any).code !== "PGRST116") {
      console.warn("Profile delete warning:", profileDelError);
    }

    const { error: rolesDelError } = await supabaseClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesDelError && (rolesDelError as any).code !== "PGRST116") {
      console.warn("user_roles delete warning:", rolesDelError);
    }

    // 🆕 GDPR: Ștergere date YANA Existential Continuity
    console.log(`[delete-user] Cleaning up YANA data for user ${userId}...`);
    
    // Șterge yana_relationships
    const { error: yanaRelError } = await supabaseClient
      .from("yana_relationships")
      .delete()
      .eq("user_id", userId);
    if (yanaRelError) console.warn("yana_relationships delete warning:", yanaRelError);
    
    // Șterge yana_journal
    const { error: yanaJournalError } = await supabaseClient
      .from("yana_journal")
      .delete()
      .eq("user_id", userId);
    if (yanaJournalError) console.warn("yana_journal delete warning:", yanaJournalError);
    
    // Șterge hook_signals
    const { error: hookSignalsError } = await supabaseClient
      .from("hook_signals")
      .delete()
      .eq("user_id", userId);
    if (hookSignalsError) console.warn("hook_signals delete warning:", hookSignalsError);
    
    // Șterge user_journey (dacă există)
    const { error: userJourneyError } = await supabaseClient
      .from("user_journey")
      .delete()
      .eq("user_id", userId);
    if (userJourneyError) console.warn("user_journey delete warning:", userJourneyError);
    
    console.log(`[delete-user] YANA data cleanup completed for user ${userId}`);

    console.log(`User ${userId} deleted successfully by admin ${requestingUser.email}`);

    // Trimite email de confirmare ștergere (nu blochez ștergerea dacă emailul eșuează)
    try {
      const emailPayload = {
        userEmail: deletedUserEmail,
        userName: deletedUserName,
        deletedBy: requestingUser.email,
        deletionDate: new Date().toLocaleString('ro-RO', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      console.log("Trimit email de confirmare ștergere...", emailPayload);

      const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-account-deletion-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify(emailPayload)
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.warn("⚠️ Eroare trimitere email confirmare:", errorText);
      } else {
        console.log("✅ Email de confirmare ștergere trimis cu succes");
      }
    } catch (emailError) {
      console.warn("⚠️ Nu s-a putut trimite emailul de confirmare:", emailError);
      // Continuăm - ștergerea s-a făcut cu succes chiar dacă emailul a eșuat
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User deleted successfully. Confirmation email sent." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
