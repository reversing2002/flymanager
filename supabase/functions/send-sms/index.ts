import { serve } from 'https://deno.fresh.dev/std@0.177.0/http/server.ts'
import { Twilio } from 'npm:twilio'

const twilioClient = new Twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID')!,
  Deno.env.get('TWILIO_AUTH_TOKEN')!
)

serve(async (req) => {
  try {
    const { phone, message } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { status: 400 }
      )
    }

    const result = await twilioClient.messages.create({
      body: message,
      to: phone,
      from: Deno.env.get('TWILIO_FROM_NUMBER')
    })

    return new Response(
      JSON.stringify({ success: true, messageId: result.sid }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})
