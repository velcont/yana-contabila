import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientData {
  company_name: string;
  contact_email?: string;
  phone?: string;
  contact_person?: string;
  notes?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; client: string; error: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[IMPORT-CRM] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Nu sunteți autentificat' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[IMPORT-CRM] User authenticated:', user.id);

    // Verify accountant subscription
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_type, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.subscription_type !== 'accounting_firm') {
      console.error('[IMPORT-CRM] Invalid subscription:', profileError);
      return new Response(
        JSON.stringify({ error: 'Acces restricționat. Necesită plan Contabil activ.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[IMPORT-CRM] Subscription verified:', profile.subscription_type);

    // Parse request body
    const { clients } = await req.json();

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Niciun client trimis pentru import' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (clients.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Puteți importa maxim 1000 de clienți per operațiune' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[IMPORT-CRM] Starting import of ${clients.length} clients`);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process clients in batches of 10
    const batchSize = 10;
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (client: ClientData, batchIndex: number) => {
          const rowNumber = i + batchIndex + 2; // +2 because row 1 is header and array is 0-indexed
          
          try {
            // Validate required fields
            if (!client.company_name || client.company_name.trim() === '') {
              throw new Error('Numele companiei este obligatoriu');
            }

            // Validate email format if provided
            if (client.contact_email && !isValidEmail(client.contact_email)) {
              throw new Error('Format email invalid');
            }

            // Clean phone number
            const cleanPhone = client.phone ? client.phone.replace(/\s/g, '') : undefined;

            let userId = null;

            // Check if user with this email already exists
            if (client.contact_email) {
              const { data: existingProfile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('email', client.contact_email)
                .single();

              if (existingProfile) {
                userId = existingProfile.id;
                console.log(`[IMPORT-CRM] Reusing existing user for ${client.contact_email}`);
              } else {
                // Create new user
                const randomPassword = generateRandomPassword();
                const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
                  email: client.contact_email,
                  password: randomPassword,
                  email_confirm: true,
                });

                if (createUserError) {
                  console.error(`[IMPORT-CRM] Error creating user:`, createUserError);
                  throw new Error(`Eroare la crearea utilizatorului: ${createUserError.message}`);
                }

                userId = newUser.user.id;
                console.log(`[IMPORT-CRM] Created new user for ${client.contact_email}`);

                // Create profile
                const { error: profileInsertError } = await supabaseClient
                  .from('profiles')
                  .insert({
                    id: userId,
                    email: client.contact_email,
                    full_name: client.contact_person || client.company_name,
                    subscription_type: 'entrepreneur',
                    account_type_selected: true,
                  });

                if (profileInsertError) {
                  console.error(`[IMPORT-CRM] Error creating profile:`, profileInsertError);
                  throw new Error('Eroare la crearea profilului');
                }
              }
            }

            // Check if company already exists
            const { data: existingCompany } = await supabaseClient
              .from('companies')
              .select('id')
              .eq('company_name', client.company_name)
              .eq('managed_by_accountant_id', user.id)
              .maybeSingle();

            if (existingCompany) {
              throw new Error('Compania există deja în lista dvs.');
            }

            // Insert company
            const { error: companyError } = await supabaseClient
              .from('companies')
              .insert({
                company_name: client.company_name,
                contact_email: client.contact_email || null,
                phone: cleanPhone || null,
                contact_person: client.contact_person || null,
                notes: client.notes || null,
                managed_by_accountant_id: user.id,
                user_id: userId,
                client_status: 'active',
                is_own_company: false,
              });

            if (companyError) {
              console.error(`[IMPORT-CRM] Error inserting company:`, companyError);
              throw new Error(`Eroare la inserarea companiei: ${companyError.message}`);
            }

            result.success++;
            console.log(`[IMPORT-CRM] Successfully imported ${client.company_name}`);
          } catch (error: any) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              client: client.company_name || 'Unknown',
              error: error.message || 'Eroare necunoscută',
            });
            console.error(`[IMPORT-CRM] Error importing client at row ${rowNumber}:`, error);
          }
        })
      );
    }

    console.log(`[IMPORT-CRM] Import completed. Success: ${result.success}, Failed: ${result.failed}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[IMPORT-CRM] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Eroare la procesarea cererii' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateRandomPassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
