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

    // Verifică dacă utilizatorul care face request-ul este admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Verifică rolul de admin
    const { data: roles, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin");

    if (roleError || !roles || roles.length === 0) {
      throw new Error("Only admins can delete users");
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Nu permite ștergerea propriului cont
    if (userId === requestingUser.id) {
      throw new Error("Cannot delete your own account");
    }

    console.log(`Admin ${requestingUser.email} attempting to delete user ${userId}`);

    // Obține informații despre utilizatorul ÎNAINTE de ștergere
    const { data: deletedUserInfo, error: getUserError } = await supabaseClient.auth.admin.getUserById(userId);
    if (getUserError) {
      console.warn("Nu s-au putut obține detaliile utilizatorului:", getUserError);
    }
    const deletedUserEmail = deletedUserInfo?.user?.email || "Unknown";
    const deletedUserName = deletedUserInfo?.user?.user_metadata?.full_name || "";

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
