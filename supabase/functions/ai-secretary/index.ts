
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { message, history } = await req.json();

        // 1. Check for OpenAI Key
        const openAiKey = Deno.env.get('OPENAI_API_KEY');

        if (!openAiKey) {
            console.log('No OpenAI Key found. Returning mock response.');
            return new Response(
                JSON.stringify({
                    message: "Olá! Sou a Secretária IA. 🧠\n\nEstou funcionando, mas meu 'cérebro' (OpenAI API Key) ainda não foi configurado no servidor. Por favor, adicione a chave 'OPENAI_API_KEY' nos Secrets do Supabase para eu ficar inteligente de verdade! 🚀",
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                },
            );
        }

        // 2. Simple System Prompt
        const systemPrompt = `Você é uma secretária virtual eficiente e amigável de uma clínica odontológica chamada "Organiza Odonto".
    Seu objetivo é ajudar o dentista com informações rápidas, ser cordial e profissional.
    Responda em português do Brasil. Seja concisa.`;

        // 3. Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...(history || []).map((msg: any) => ({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    })),
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const aiMessage = data.choices[0]?.message?.content || "Desculpe, não entendi.";

        return new Response(
            JSON.stringify({ message: aiMessage }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        );
    }
});
