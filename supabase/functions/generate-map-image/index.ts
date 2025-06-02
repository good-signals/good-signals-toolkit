
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      console.error('Google Maps API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured." }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    const { latitude, longitude, zoom = 15, size = '600x300' } = requestBody;

    if (!latitude || !longitude) {
      console.error('Missing latitude or longitude in request');
      return new Response(
        JSON.stringify({ error: "Latitude and longitude are required." }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.error('Invalid coordinate types:', { latitude: typeof latitude, longitude: typeof longitude });
      return new Response(
        JSON.stringify({ error: "Latitude and longitude must be numbers." }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate Google Maps Static API URL
    const marker = `color:red|${latitude},${longitude}`;
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&markers=${marker}&key=${googleMapsApiKey}`;

    console.log('Generated map URL:', mapUrl);

    // Test the map URL by making a HEAD request
    try {
      const testResponse = await fetch(mapUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.error('Google Maps API returned error:', testResponse.status, testResponse.statusText);
        return new Response(
          JSON.stringify({ error: `Google Maps API error: ${testResponse.status}` }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (testError) {
      console.error('Error testing map URL:', testError);
      return new Response(
        JSON.stringify({ error: "Failed to validate map URL" }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: mapUrl,
        coordinates: { latitude, longitude },
        zoom,
        size
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-map-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to generate map image: ${error.message}`,
        stack: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
