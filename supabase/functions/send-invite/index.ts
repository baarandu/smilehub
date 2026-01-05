import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const handler = async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not set')
        }

        const payload = await request.json()
        const { record } = payload

        if (!record || !record.email) {
            throw new Error('No email found in record')
        }

        console.log('Sending invite to:', record.email)

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Smile Care Hub <onboarding@resend.dev>', // User should change this after verifying domain
                to: [record.email],
                subject: 'Você foi convidado para o Smile Care Hub',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá!</h2>
            <p>Você foi convidado para participar da equipe no <strong>Smile Care Hub</strong>.</p>
            <p>Sua função será: <strong>${record.role}</strong></p>
            <p>Para aceitar o convite, clique no botão abaixo e crie sua conta (ou faça login) usando este email:</p>
            <a href="https://smile-care-hub.vercel.app/" style="background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              Acessar Plataforma
            </a>
            <p style="margin-top: 32px; color: #666; font-size: 14px;">
              Se você não esperava por este convite, pode ignorar este email.
            </p>
          </div>
        `,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('Resend Error:', data)
            throw new Error(JSON.stringify(data))
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

serve(handler)
