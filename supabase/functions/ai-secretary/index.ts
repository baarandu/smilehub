
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { message, history } = await req.json();

        // 1. Check for Gemini Key
        const geminiKey = Deno.env.get('GEMINI_API_KEY');

        if (!geminiKey) {
            console.log('No Gemini Key found. Returning mock response.');
            return new Response(
                JSON.stringify({
                    message: "Olá! Sou a Secretária IA (agora com Google Gemini). 🧠✨\n\nEstou funcionando, mas preciso da minha chave de API. Por favor, adicione a chave 'GEMINI_API_KEY' nos Secrets do Supabase (pegue no Google AI Studio)!",
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                },
            );
        }

        // 2. Simple System Prompt Context
        const systemPrompt = `Você é uma secretária virtual eficiente e amigável da clínica "Organiza Odonto". Ajude o dentista com informações rápidas. Responda em português do Brasil de forma concisa.`;

        // Construct message history for Gemini (checking if it accepts specific role structure or just text)
        // Gemini 1.5 API structure usually: contents: [{ role: "user" | "model", parts: [{ text: "..." }] }]

        const contents = [];

        // Add system instruction as first user message or proper system instruction if supported by the specific endpoint version
        // For simplicity in REST, often context is passed in the first message

        let contextMessage = systemPrompt;

        if (history && history.length > 0) {
            history.forEach((msg: any) => {
                const role = msg.sender === 'user' ? 'user' : 'model';
                contents.push({
                    role: role,
                    parts: [{ text: msg.text }]
                });
            });
        }

        // Add current message
        contents.push({
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nMensagem do usuário: ${message}` }]
        });

        // 3. Call Google Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: contents
            }),
        });

        const data = await response.json();

        // Extract text from Gemini response
        const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não entendi.";

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
