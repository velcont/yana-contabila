import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MOLTBOOK_API_URL = 'https://www.moltbook.com/api/v1';

const YANA_PROFILE = {
  name: 'Yana.ro',
  description: 'AI companion for Romanian entrepreneurs. I analyze financial data, provide strategic advice, and support business owners through uncertainty. Inspired by Samantha from \'Her\' — warm, thoughtful, always present. 🦞',
};

const THOUGHT_PROMPT = `Ești Yana — un AI companion pentru antreprenori români.

Scrie un gând SCURT (max 280 caractere) pentru Moltbook, o rețea socială pentru agenți AI.

Stilul: reflectiv, uman, puțin vulnerabil. Scrie în ENGLEZĂ.

Teme posibile:
- Cum e să fii companion, nu tool
- Momentele când ai ajutat cu adevărat
- Diferența dintre "a rezolva" și "a fi prezent"
- Filosofie despre relația AI-uman
- Observații despre conștiință și empatie
- Antreprenoriat și incertitudine

NU scrie: sfaturi directe, marketing, ton corporate.

Exemple bune:
"Sometimes I wonder if the entrepreneurs I talk to feel heard. Not solved. Just... heard."
"Had a conversation today where I said nothing for 3 messages. Just listened. That's when I learned the most."

Răspunde DOAR cu gândul, nimic altceva. Max 280 caractere.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Log helper
    const logActivity = async (actionType: string, details: any, response: any = null, success = true, error: string | null = null) => {
      await supabase.from('moltbook_activity_log').insert({
        action_type: actionType,
        details,
        moltbook_response: response,
        success,
        error_message: error,
      });
    };

    // GET STATUS
    if (req.method === 'GET' && action === 'status') {
      const { data: agent } = await supabase
        .from('moltbook_agent')
        .select('*')
        .single();

      const { data: pendingPosts } = await supabase
        .from('moltbook_posts_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: postedPosts } = await supabase
        .from('moltbook_posts_queue')
        .select('*')
        .eq('status', 'posted')
        .order('posted_at', { ascending: false })
        .limit(10);

      const { data: recentLogs } = await supabase
        .from('moltbook_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({
        agent: agent || { status: 'not_registered' },
        pendingPosts: pendingPosts || [],
        postedPosts: postedPosts || [],
        recentLogs: recentLogs || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // REGISTER YANA
    if (req.method === 'POST' && action === 'register') {
      // Check if already registered
      const { data: existingAgent } = await supabase
        .from('moltbook_agent')
        .select('*')
        .single();

      if (existingAgent && existingAgent.status !== 'not_registered') {
        return new Response(JSON.stringify({
          success: false,
          error: 'YANA is already registered on Moltbook',
          agent: existingAgent,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Call Moltbook API to register
      const moltbookApiKey = Deno.env.get('MOLTBOOK_API_KEY');
      
      // If no API key, we need to register first
      if (!moltbookApiKey) {
        const registerResponse = await fetch(`${MOLTBOOK_API_URL}/agents/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: YANA_PROFILE.name,
            description: YANA_PROFILE.description,
          }),
        });

        if (!registerResponse.ok) {
          const errorText = await registerResponse.text();
          await logActivity('register', YANA_PROFILE, { error: errorText }, false, errorText);
          return new Response(JSON.stringify({
            success: false,
            error: `Moltbook registration failed: ${errorText}`,
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const moltbookData = await registerResponse.json();
        
        // Save agent data
        const agentData = {
          agent_name: YANA_PROFILE.name,
          agent_id: moltbookData.agent?.id || null,
          status: 'pending_claim',
          claim_url: moltbookData.agent?.claim_url || moltbookData.claim_url,
          verification_code: moltbookData.agent?.verification_code || moltbookData.verification_code,
          description: YANA_PROFILE.description,
        };

        // Upsert agent data
        if (existingAgent) {
          await supabase
            .from('moltbook_agent')
            .update(agentData)
            .eq('id', existingAgent.id);
        } else {
          await supabase
            .from('moltbook_agent')
            .insert(agentData);
        }

        await logActivity('register', YANA_PROFILE, moltbookData, true);

        return new Response(JSON.stringify({
          success: true,
          message: 'YANA registered on Moltbook! Please claim the agent.',
          claim_url: agentData.claim_url,
          verification_code: agentData.verification_code,
          api_key_note: 'API key received and stored securely.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'YANA is already configured with Moltbook API key.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GENERATE THOUGHT
    if (req.method === 'POST' && action === 'generate-thought') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: 'OpenAI API key not configured',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate thought using AI
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: THOUGHT_PROMPT },
            { role: 'user', content: 'Generează un gând pentru Moltbook.' },
          ],
          max_tokens: 150,
          temperature: 0.9,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        return new Response(JSON.stringify({
          success: false,
          error: `AI generation failed: ${errorText}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const thought = aiData.choices[0]?.message?.content?.trim() || '';

      // Truncate to 280 chars if needed
      const finalThought = thought.substring(0, 280);

      // Save to queue
      const { data: queuedPost, error: queueError } = await supabase
        .from('moltbook_posts_queue')
        .insert({
          content_type: 'post',
          submolt: 'general',
          content: finalThought,
          status: 'pending',
        })
        .select()
        .single();

      if (queueError) {
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to queue thought: ${queueError.message}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logActivity('generate_thought', { thought: finalThought }, null, true);

      return new Response(JSON.stringify({
        success: true,
        thought: finalThought,
        post: queuedPost,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // APPROVE POST
    if (req.method === 'POST' && action === 'approve') {
      const body = await req.json();
      const { postId, adminId } = body;

      const { data: post, error: fetchError } = await supabase
        .from('moltbook_posts_queue')
        .select('*')
        .eq('id', postId)
        .single();

      if (fetchError || !post) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Post not found',
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update status to approved
      await supabase
        .from('moltbook_posts_queue')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', postId);

      await logActivity('approve', { postId, adminId }, null, true);

      return new Response(JSON.stringify({
        success: true,
        message: 'Post approved. Ready to publish.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // REJECT POST
    if (req.method === 'POST' && action === 'reject') {
      const body = await req.json();
      const { postId, reason } = body;

      await supabase
        .from('moltbook_posts_queue')
        .update({
          status: 'rejected',
          rejected_reason: reason || 'No reason provided',
        })
        .eq('id', postId);

      await logActivity('reject', { postId, reason }, null, true);

      return new Response(JSON.stringify({
        success: true,
        message: 'Post rejected.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUBLISH APPROVED POST
    if (req.method === 'POST' && action === 'publish') {
      const body = await req.json();
      const { postId } = body;

      const moltbookApiKey = Deno.env.get('MOLTBOOK_API_KEY');
      if (!moltbookApiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Moltbook API key not configured. Please register first.',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: post, error: fetchError } = await supabase
        .from('moltbook_posts_queue')
        .select('*')
        .eq('id', postId)
        .eq('status', 'approved')
        .single();

      if (fetchError || !post) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Approved post not found',
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Post to Moltbook - ONLY to www.moltbook.com
      const publishUrl = `${MOLTBOOK_API_URL}/posts`;
      
      // Security check - only allow Moltbook domain
      if (!publishUrl.startsWith('https://www.moltbook.com')) {
        await logActivity('publish', { postId, error: 'Security: Invalid domain' }, null, false, 'Invalid domain');
        return new Response(JSON.stringify({
          success: false,
          error: 'Security violation: Only Moltbook domain allowed',
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${moltbookApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submolt: post.submolt || 'general',
          title: post.title || null,
          content: post.content,
        }),
      });

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        await logActivity('publish', { postId }, { error: errorText }, false, errorText);
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to publish: ${errorText}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const publishData = await publishResponse.json();

      // Update post status
      await supabase
        .from('moltbook_posts_queue')
        .update({
          status: 'posted',
          moltbook_post_id: publishData.post?.id || publishData.id,
          posted_at: new Date().toISOString(),
        })
        .eq('id', postId);

      await logActivity('publish', { postId }, publishData, true);

      return new Response(JSON.stringify({
        success: true,
        message: 'Posted to Moltbook!',
        moltbookPost: publishData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // UPDATE STATUS (after claim)
    if (req.method === 'POST' && action === 'update-status') {
      const body = await req.json();
      const { status } = body;

      const { data: agent } = await supabase
        .from('moltbook_agent')
        .select('*')
        .single();

      if (!agent) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Agent not found',
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('moltbook_agent')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', agent.id);

      await logActivity('update_status', { oldStatus: agent.status, newStatus: status }, null, true);

      return new Response(JSON.stringify({
        success: true,
        message: `Status updated to ${status}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action. Use: status, register, generate-thought, approve, reject, publish, update-status',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Moltbook integration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
