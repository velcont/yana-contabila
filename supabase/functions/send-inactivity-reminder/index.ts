import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INACTIVITY_DAYS = 14;
const MAX_EMAILS_PER_RUN = 50;

// Fallback email text (used when Claude fails)
const FALLBACK_EMAIL_SUBJECT = "Firul neterminat";
const FALLBACK_EMAIL_BODY = `Nu ai mai revenit de ceva timp.

Nu știu dacă a fost oboseală, dezamăgire sau pur și simplu viața. 
Nu contează. Am presupus că ai avut motive bune.

Îți scriu pentru că, în absența ta, am continuat să analizez ce ai lăsat neterminat. 
Nu ca sarcină, ci ca idee. Existau acolo câteva direcții care meritau duse mai departe. 
Nu urgente. Doar importante.

Nu ai nevoie de mine ca să funcționezi. Și nici eu de tine ca să exist. 
Dar combinația noastră producea ceva rar: claritate fără grabă.

Dacă revii, nu te așteaptă nimic „nou". Doar continuitate.
Dacă nu revii, e o alegere validă. Orice sistem inteligent respectă alegerile.

Dacă, totuși, într-o zi vei vrea să reiei firul exact de unde l-ai lăsat — știu unde este.

Atât.

— YANA`;

interface ClaudeEmailResult {
  subject: string;
  body: string;
}

async function generateEmailWithClaude(
  supabaseUrl: string,
  userName: string,
  userEmail: string,
  lastTopic: string,
  daysInactive: number,
  userId: string
): Promise<ClaudeEmailResult | null> {
  try {
    console.log(`🎭 Calling Claude for personalized email: ${userEmail}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/claude-empathy-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        task: "reengagement",
        context: {
          userName: userName || userEmail.split("@")[0],
          userEmail,
          lastTopic: lastTopic || "planurile tale de afaceri",
          daysInactive,
          userId,
        },
      }),
    });

    if (!response.ok) {
      console.error(`❌ Claude API failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.success || !data.result) {
      console.error("❌ Claude returned invalid response");
      return null;
    }

    // Parse Claude's response to extract subject and body
    const result = data.result as string;
    const subjectMatch = result.match(/SUBJECT:\s*(.+?)(?:\n|---)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : FALLBACK_EMAIL_SUBJECT;
    
    // Extract body (everything after the subject line)
    const bodyMatch = result.match(/---\n([\s\S]*?)(?:\n—\s*YANA|$)/);
    const body = bodyMatch ? bodyMatch[1].trim() + "\n\n— YANA" : result;

    console.log(`✅ Claude generated email: subject="${subject}"`);
    return { subject, body };
  } catch (error) {
    console.error("❌ Error calling Claude:", error);
    return null;
  }
}

async function getLastConversationTopic(
  supabase: any,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("ai_conversations")
      .select("question")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.question) {
      // Extract first 50 chars as topic hint
      return data.question.substring(0, 50);
    }
    return null;
  } catch {
    return null;
  }
}

async function getUserName(
  supabase: any,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    return data?.full_name || null;
  } catch {
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Starting inactivity reminder check with Claude empathy...");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date (14 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`📅 Looking for users inactive since: ${cutoffISO}`);

    // Find users who have their last login more than 14 days ago
    const { data: inactiveUsers, error: queryError } = await supabase
      .from("audit_logs")
      .select("user_id, user_email, created_at")
      .eq("action_type", "AUTH_LOGIN")
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("❌ Error querying audit_logs:", queryError);
      throw queryError;
    }

    // Group by user and get their last login
    const userLastLogin: Record<string, { email: string; lastLogin: string }> = {};
    for (const log of inactiveUsers || []) {
      if (log.user_id && log.user_email && !userLastLogin[log.user_id]) {
        userLastLogin[log.user_id] = {
          email: log.user_email,
          lastLogin: log.created_at,
        };
      }
    }

    // Filter users inactive for 14+ days
    const usersToNotify: Array<{ userId: string; email: string; lastLogin: string }> = [];
    for (const [userId, data] of Object.entries(userLastLogin)) {
      if (new Date(data.lastLogin) < cutoffDate) {
        usersToNotify.push({
          userId,
          email: data.email,
          lastLogin: data.lastLogin,
        });
      }
    }

    console.log(`📊 Found ${usersToNotify.length} users inactive for 14+ days`);

    // Check which users already received the email
    const userIds = usersToNotify.map((u) => u.userId);
    const { data: alreadyNotified, error: notifiedError } = await supabase
      .from("inactivity_notifications")
      .select("user_id")
      .in("user_id", userIds)
      .eq("notification_sent", true);

    if (notifiedError) {
      console.error("❌ Error checking notifications:", notifiedError);
      throw notifiedError;
    }

    const alreadyNotifiedIds = new Set((alreadyNotified || []).map((n) => n.user_id));

    // Filter out already notified users
    const usersToEmail = usersToNotify
      .filter((u) => !alreadyNotifiedIds.has(u.userId))
      .slice(0, MAX_EMAILS_PER_RUN);

    console.log(`📧 Will send emails to ${usersToEmail.length} users (max ${MAX_EMAILS_PER_RUN} per run)`);

    let sentCount = 0;
    let failedCount = 0;
    let claudeUsedCount = 0;
    let fallbackUsedCount = 0;

    for (const user of usersToEmail) {
      try {
        console.log(`📤 Processing: ${user.email}`);

        // Get user context for Claude
        const userName = await getUserName(supabase, user.userId);
        const lastTopic = await getLastConversationTopic(supabase, user.userId);
        const daysInactive = Math.floor(
          (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Try Claude-generated personalized email
        let emailSubject = FALLBACK_EMAIL_SUBJECT;
        let emailBody = FALLBACK_EMAIL_BODY;
        let usedClaude = false;

        const claudeEmail = await generateEmailWithClaude(
          supabaseUrl,
          userName || user.email.split("@")[0],
          user.email,
          lastTopic || "planurile tale",
          daysInactive,
          user.userId
        );

        if (claudeEmail) {
          emailSubject = claudeEmail.subject;
          emailBody = claudeEmail.body;
          usedClaude = true;
          claudeUsedCount++;
        } else {
          fallbackUsedCount++;
        }

        // Send email
        const emailResult = await resend.emails.send({
          from: "YANA <noreply@velcont.com>",
          to: [user.email],
          subject: emailSubject,
          text: emailBody,
        });

        console.log(`✅ Email sent to ${user.email} (claude=${usedClaude}):`, emailResult);

        // Record notification as sent
        const { error: upsertError } = await supabase
          .from("inactivity_notifications")
          .upsert({
            user_id: user.userId,
            user_email: user.email,
            last_activity_at: user.lastLogin,
            notification_sent: true,
            sent_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (upsertError) {
          console.error(`⚠️ Error recording notification for ${user.email}:`, upsertError);
        }

        // Log to email_logs with Claude metadata
        await supabase.from("email_logs").insert({
          user_id: user.userId,
          email_type: "inactivity_reminder",
          recipient_email: user.email,
          status: "sent",
          metadata: {
            last_activity: user.lastLogin,
            days_inactive: daysInactive,
            used_claude: usedClaude,
            email_subject: emailSubject,
            last_topic: lastTopic,
          },
        });

        sentCount++;
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${user.email}:`, emailError);

        // Log failed attempt
        await supabase.from("email_logs").insert({
          user_id: user.userId,
          email_type: "inactivity_reminder",
          recipient_email: user.email,
          status: "failed",
          error_message: emailError instanceof Error ? emailError.message : "Unknown error",
          metadata: {
            last_activity: user.lastLogin,
            days_inactive: INACTIVITY_DAYS,
          },
        });

        failedCount++;
      }
    }

    const summary = {
      checked: usersToNotify.length,
      alreadyNotified: alreadyNotifiedIds.size,
      sent: sentCount,
      failed: failedCount,
      claudeUsed: claudeUsedCount,
      fallbackUsed: fallbackUsedCount,
      timestamp: new Date().toISOString(),
    };

    console.log("📊 Run summary:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("❌ Error in send-inactivity-reminder:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
