
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return handleCorsOptions(req);
    }

    try {
        const { message, history } = await req.json();

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) {
            return new Response(
                JSON.stringify({
                    message: "Secretária IA indisponível. A chave OPENAI_API_KEY não está configurada nos Secrets do Supabase.",
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                },
            );
        }

        const systemPrompt = `Você é uma secretária virtual eficiente e amigável da clínica "Organiza Odonto". Ajude o dentista com informações rápidas. Responda em português do Brasil de forma concisa.`;

        const messages: any[] = [
            { role: "system", content: systemPrompt },
        ];

        if (history && history.length > 0) {
            history.forEach((msg: any) => {
                const role = msg.sender === 'user' ? 'user' : 'assistant';
                messages.push({ role, content: msg.text });
            });
        }

        messages.push({ role: "user", content: message });

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages,
                temperature: 0.7,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI API error:", errorText);
            throw new Error(`Erro no serviço de IA (código: ${response.status})`);
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || "Desculpe, não entendi.";

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
