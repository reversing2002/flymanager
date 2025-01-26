import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  from: string
  to: string
  subject: string
  message: string
  name: string
  clubName: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { from, to, subject, message, name, clubName } = await req.json() as EmailPayload

    // Création du client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Configuration de l'email
    const emailData = {
      from: 'noreply@4fly.io',
      to,
      subject: `[Contact ${clubName}] ${subject}`,
      html: `
        <h2>Nouveau message de contact - ${clubName}</h2>
        <p><strong>De :</strong> ${name} (${from})</p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <p><strong>Message :</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Ce message a été envoyé via le formulaire de contact de votre site web 4fly.
        </p>
      `
    }

    // Envoi de l'email via le service email de Supabase
    const { error } = await supabaseClient.functions.invoke('send-email', {
      body: emailData
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Email envoyé avec succès' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
