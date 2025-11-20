import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('🔍 Căutăm contabili cu Google Calendar conectat...');

    // 1. Găsim toți contabilii cu calendar conectat
    const { data: accountantsWithCalendar, error: calError } = await supabase
      .from('calendar_tokens')
      .select('user_id, access_token, refresh_token, token_expiry');

    if (calError) {
      console.error('❌ Eroare la citire calendar_tokens:', calError);
      throw calError;
    }

    if (!accountantsWithCalendar || accountantsWithCalendar.length === 0) {
      console.log('ℹ️ Niciun contabil nu are Google Calendar conectat');
      return new Response(
        JSON.stringify({ message: 'Niciun contabil cu calendar conectat' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ ${accountantsWithCalendar.length} contabili cu calendar conectat`);

    const results = [];

    for (const accountant of accountantsWithCalendar) {
      try {
        console.log(`\n📅 Procesăm contabil: ${accountant.user_id}`);

        // 2. Reîmprospătăm token-ul dacă e expirat
        let accessToken = accountant.access_token;
        const tokenExpiry = new Date(accountant.token_expiry);
        const currentTime = new Date();

        if (currentTime >= tokenExpiry) {
          console.log('🔄 Token expirat, reîmprospătăm...');
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
              refresh_token: accountant.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (!refreshResponse.ok) {
            console.error('❌ Nu am putut reîmprospăta token-ul');
            continue;
          }

          const newTokens = await refreshResponse.json();
          accessToken = newTokens.access_token;
          const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

          await supabase
            .from('calendar_tokens')
            .update({ access_token: accessToken, token_expiry: newExpiry })
            .eq('user_id', accountant.user_id);

          console.log('✅ Token reîmprospătat cu succes');
        }

        // 3. Citim evenimente din Google Calendar pentru luna curentă
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${firstDayOfMonth}&timeMax=${lastDayOfMonth}&` +
          `q=Inchidere Luna&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!calendarResponse.ok) {
          console.error('❌ Eroare la citire Google Calendar');
          continue;
        }

        const calendarData = await calendarResponse.json();
        const events: CalendarEvent[] = calendarData.items || [];

        console.log(`📋 ${events.length} evenimente "Inchidere Luna" găsite`);

        if (events.length === 0) {
          continue;
        }

        // 4. Pentru fiecare eveniment, verificăm plata în Stripe
        for (const event of events) {
          // Extragem CUI din summary sau description
          const cuiMatch = (event.summary + ' ' + (event.description || '')).match(/\b\d{8,10}\b/);
          if (!cuiMatch) {
            console.log(`⚠️ Nu am găsit CUI în evenimentul: ${event.summary}`);
            continue;
          }

          const cui = cuiMatch[0];
          console.log(`🔍 Verificăm plata pentru CUI: ${cui}`);

          // Găsim compania
          const { data: company, error: compError } = await supabase
            .from('companies')
            .select('id, company_name, stripe_customer_id')
            .eq('cui', cui)
            .eq('managed_by_accountant_id', accountant.user_id)
            .single();

          if (compError || !company) {
            console.log(`⚠️ Companie cu CUI ${cui} nu găsită în baza de date`);
            continue;
          }

          if (!company.stripe_customer_id) {
            console.log(`⚠️ Compania ${company.company_name} nu are Stripe Customer ID`);
            continue;
          }

          // Verificăm în Stripe dacă există plată pentru luna curentă
          const monthYear = today.toISOString().slice(0, 7); // "2025-01"
          const stripeResponse = await fetch(
            `https://api.stripe.com/v1/invoices?customer=${company.stripe_customer_id}&limit=10`,
            {
              headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
              },
            }
          );

          if (!stripeResponse.ok) {
            console.error('❌ Eroare la verificare Stripe');
            continue;
          }

          const stripeData = await stripeResponse.json();
          const paidThisMonth = stripeData.data.some((invoice: any) => {
            const invoiceDate = new Date(invoice.created * 1000).toISOString().slice(0, 7);
            return invoiceDate === monthYear && invoice.status === 'paid';
          });

          if (paidThisMonth) {
            console.log(`✅ Compania ${company.company_name} A PLĂTIT pentru ${monthYear}`);
            continue;
          }

          console.log(`🔴 Compania ${company.company_name} NU A PLĂTIT pentru ${monthYear} - Trimitem email...`);

          // 5. Trimitem email către contabil
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'YANA Notifications <noreply@yana.ro>',
              to: accountant.user_id, // Trebuie să fie email-ul contabilului
              subject: `⚠️ Plată Lipsă: ${company.company_name} (${cui})`,
              html: `
                <h2>⚠️ Plată Lipsă pentru Închidere Lună</h2>
                <p><strong>Companie:</strong> ${company.company_name}</p>
                <p><strong>CUI:</strong> ${cui}</p>
                <p><strong>Lună:</strong> ${monthYear}</p>
                <p><strong>Eveniment Calendar:</strong> ${event.summary}</p>
                <p><strong>Dată Eveniment:</strong> ${event.start.dateTime || event.start.date}</p>
                <hr>
                <p>Clientul nu a plătit încă serviciul de închidere lună pentru ${monthYear}.</p>
                <p>Verifică în Stripe sau contactează clientul.</p>
              `,
            }),
          });

          if (!emailResponse.ok) {
            console.error('❌ Eroare la trimitere email Resend');
          } else {
            console.log(`✅ Email trimis cu succes pentru ${company.company_name}`);
          }

          results.push({
            company: company.company_name,
            cui,
            monthYear,
            emailSent: emailResponse.ok,
          });
        }

      } catch (error) {
        console.error(`❌ Eroare la procesare contabil ${accountant.user_id}:`, error);
      }
    }

    console.log('\n✅ Verificare completă. Rezultate:', results);

    return new Response(
      JSON.stringify({
        message: 'Verificare completă',
        accountantsProcessed: accountantsWithCalendar.length,
        unpaidCompanies: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Eroare globală în check-unpaid-inchidere-luna:', error);
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
