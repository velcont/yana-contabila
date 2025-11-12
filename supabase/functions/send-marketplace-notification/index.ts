import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const { type, data } = await req.json();

    if (type === 'new_job_posting') {
      // Get all active accountants
      const { data: accountants } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('subscription_type', 'accounting_firm')
        .eq('subscription_status', 'active');

      if (!accountants || accountants.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No accountants to notify' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send email notifications via Resend API
      for (const accountant of accountants) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@yana.ro',
            to: accountant.email,
            subject: `🔔 Anunț NOU: ${data.company_name} caută contabil`,
            html: `
              <h2>Anunț NOU în Marketplace YANA</h2>
              <p>Bună ${accountant.full_name || 'Contabil'},</p>
              <p><strong>${data.company_name}</strong> (CUI: ${data.cui}) caută servicii de contabilitate.</p>
              
              <h3>Detalii:</h3>
              <ul>
                <li>TVA: ${data.is_vat_payer ? 'DA' : 'NU'}</li>
                <li>Regim impozitare: ${data.tax_type}</li>
                <li>Documente/lună: ${data.documents_per_month}</li>
                <li>Angajați: ${data.employees_count}</li>
                <li>Buget: ${data.budget_min} - ${data.budget_max} RON/lună</li>
              </ul>
              
              ${data.special_requirements ? `<p><strong>Cerințe speciale:</strong> ${data.special_requirements}</p>` : ''}
              
              <p><a href="https://yana.ro/dashboard?tab=marketplace">Trimite Ofertă →</a></p>
              
              <p>Cu stimă,<br>Echipa YANA</p>
            `,
          }),
        });

        // Create in-app notification
        await supabaseClient.from('user_notifications').insert({
          user_id: accountant.id,
          type: 'marketplace_new_job',
          title: `🔔 Anunț NOU: ${data.company_name}`,
          message: `${data.company_name} caută contabil. Buget: ${data.budget_min}-${data.budget_max} RON/lună`,
          priority: 'high',
          metadata: {
            job_posting_id: data.job_posting_id,
            company_name: data.company_name,
            cui: data.cui,
          },
        });
      }

      return new Response(
        JSON.stringify({ success: true, notified: accountants.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'new_offer') {
      // Notify entrepreneur about new offer
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', data.entrepreneur_id)
        .single();

      if (!profile) {
        throw new Error('Entrepreneur not found');
      }

      // Send email via Resend API
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@yana.ro',
          to: profile.email,
          subject: `💼 Ai primit o ofertă de la ${data.accountant_name}`,
          html: `
            <h2>Ai primit o ofertă nouă!</h2>
            <p>Bună ${profile.full_name || 'Antreprenor'},</p>
            <p><strong>${data.accountant_name}</strong> ți-a trimis o ofertă pentru servicii de contabilitate.</p>
            
            <h3>Detalii ofertă:</h3>
            <ul>
              <li>Preț: ${data.price_per_month} RON/lună</li>
              <li>Servicii incluse: ${data.services_included.join(', ')}</li>
            </ul>
            
            <p><strong>Mesaj:</strong><br>${data.message}</p>
            
            <p><a href="https://yana.ro/dashboard?tab=marketplace">Vezi Oferta →</a></p>
            
            <p>Cu stimă,<br>Echipa YANA</p>
          `,
        }),
      });

      // Create in-app notification
      await supabaseClient.from('user_notifications').insert({
        user_id: data.entrepreneur_id,
        type: 'marketplace_new_offer',
        title: `💼 Ofertă nouă de la ${data.accountant_name}`,
        message: `${data.accountant_name} ți-a trimis o ofertă: ${data.price_per_month} RON/lună`,
        priority: 'high',
        metadata: {
          offer_id: data.offer_id,
          job_posting_id: data.job_posting_id,
          accountant_name: data.accountant_name,
          price_per_month: data.price_per_month,
        },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid notification type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
