
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CompanyDetails {
  userId: string;
  companyName: string;
  companyAddress: string;
  companyCategory: string;
  companySubcategory: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      userId,
      companyName,
      companyAddress,
      companyCategory,
      companySubcategory,
    }: CompanyDetails = await req.json();

    if (!userId || !companyName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId and companyName' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Create the account
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        name: companyName,
        address: companyAddress,
        category: companyCategory,
        subcategory: companySubcategory,
      })
      .select('id')
      .single();

    if (accountError) {
      console.error('Error creating account:', accountError);
      return new Response(JSON.stringify({ error: `Failed to create company: ${accountError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const accountId = accountData.id;

    // 2. Create the account membership for the user as 'account_admin'
    const { error: membershipError } = await supabaseAdmin
      .from('account_memberships')
      .insert({
        user_id: userId,
        account_id: accountId,
        role: 'account_admin',
      });

    if (membershipError) {
      console.error('Error creating account membership:', membershipError);
      // Attempt to clean up by deleting the account if membership fails? Or handle differently.
      // For now, just return an error.
      return new Response(JSON.stringify({ error: `Failed to assign admin role: ${membershipError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Company and admin role created successfully', accountId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('General error in create-account-and-admin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
