import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an accountant
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !requestingUser) {
      console.error('Error verifying user:', userError);
      throw new Error('Unauthorized');
    }

    // Check if requesting user is accountant
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_type')
      .eq('id', requestingUser.id)
      .single();

    if (profile?.subscription_type !== 'accounting_firm') {
      throw new Error('Only accountants can create manual clients');
    }

    const { 
      email, 
      password, 
      fullName, 
      companyName, 
      cui, 
      contactPerson, 
      phone, 
      address, 
      taxType, 
      notes,
      vatPayer 
    } = await req.json();

    console.log('Creating manual client for:', email);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUsers) {
      console.log('User already exists:', existingUsers.id);
      userId = existingUsers.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          account_type: 'entrepreneur'
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      if (!newUser.user) {
        throw new Error('Failed to create user');
      }

      userId = newUser.user.id;
      console.log('Created new user:', userId);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          subscription_type: 'entrepreneur'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        user_id: userId,
        managed_by_accountant_id: requestingUser.id,
        company_name: companyName,
        cui: cui || null,
        contact_person: contactPerson || fullName,
        contact_email: email,
        contact_phone: phone || null,
        address: address || null,
        tax_type: taxType || 'micro',
        notes: notes || null,
        vat_regime: vatPayer ? 'monthly' : 'none'
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      throw companyError;
    }

    console.log('Successfully created client and company:', company.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId, 
        companyId: company.id,
        message: 'Client created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in create-manual-client:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
