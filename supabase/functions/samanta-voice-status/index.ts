// Twilio Voice Status Callback — updates call lifecycle
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    const fd = await req.formData();
    const callSid = String(fd.get("CallSid") || "");
    const callStatus = String(fd.get("CallStatus") || "");
    const duration = parseInt(String(fd.get("CallDuration") || "0"), 10);
    const recordingUrl = String(fd.get("RecordingUrl") || "");

    console.log("[samanta-voice-status]", { callSid, callStatus, duration });

    if (!callSid) return new Response("ok");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const updates: any = {};
    if (callStatus === "completed" || callStatus === "failed" || callStatus === "no-answer" || callStatus === "busy" || callStatus === "canceled") {
      updates.status = callStatus === "completed" ? "completed" : "failed";
      updates.ended_at = new Date().toISOString();
      if (duration > 0) updates.duration_seconds = duration;
      if (recordingUrl) updates.recording_url = recordingUrl;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("samanta_calls").update(updates).eq("twilio_call_sid", callSid);
    }

    return new Response("ok");
  } catch (e) {
    console.error("[samanta-voice-status] error", e);
    return new Response("ok");
  }
});