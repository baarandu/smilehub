/**
 * Message Splitter - Breaks long AI responses into natural WhatsApp-sized chunks.
 * Uses GPT-4o-mini to split intelligently, preserving context and lists.
 * Inspired by template v3 workflow 07.
 */

import * as evolution from "./evolutionClient.ts";
import * as meta from "./metaClient.ts";

const USE_META_API = !!Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const whatsapp = USE_META_API ? meta : evolution;

const OPENAI_API_KEY = () => Deno.env.get("OPENAI_API_KEY") || "";

const MIN_SPLIT_LENGTH = 200; // Don't split messages shorter than this
const MAX_PARTS = 5;
const TYPING_DELAY_PER_CHAR_MS = 15; // ~67 chars/sec typing speed
const MIN_PART_DELAY_MS = 1000;
const MAX_PART_DELAY_MS = 3500;

interface SplitBehavior {
  response_cadence_enabled?: boolean;
  send_typing_indicator?: boolean;
  typing_speed_cpm?: number;
}

/**
 * Split a long message into natural parts and send each with typing indicators.
 * For short messages, sends directly without splitting.
 */
export async function splitAndSend(
  instance: string,
  phone: string,
  text: string,
  behavior: SplitBehavior
): Promise<void> {
  // Short messages: send directly
  if (text.length < MIN_SPLIT_LENGTH) {
    await whatsapp.sendText(instance, phone, text);
    return;
  }

  // Try to split using GPT-4o-mini
  let parts: string[];
  try {
    parts = await splitWithAI(text);
  } catch {
    // Fallback: split by paragraph
    parts = splitByParagraph(text);
  }

  // Send each part with delay
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Typing indicator between parts (not before first)
    if (i > 0 && behavior.send_typing_indicator) {
      whatsapp.sendPresence(instance, phone, true).catch(() => {});
    }

    // Delay between parts (not before first)
    if (i > 0 && behavior.response_cadence_enabled !== false) {
      const delay = calculatePartDelay(part.length);
      await sleep(delay);
    }

    await whatsapp.sendText(instance, phone, part);
  }
}

/**
 * Use GPT-4o-mini to split a message into natural conversational parts.
 */
async function splitWithAI(text: string): Promise<string[]> {
  const apiKey = OPENAI_API_KEY();
  if (!apiKey) return splitByParagraph(text);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente que divide mensagens longas em partes menores para WhatsApp.

REGRAS:
1. Divida em 2-${MAX_PARTS} partes naturais
2. Cada parte deve fazer sentido sozinha
3. NUNCA quebre listas, tabelas ou informações estruturadas no meio
4. Mantenha o tom e formatação original
5. Não adicione nada novo, apenas divida
6. Retorne APENAS um JSON array de strings: ["parte1", "parte2", ...]
7. Se a mensagem já é curta o suficiente, retorne ["mensagem original"]`,
        },
        {
          role: "user",
          content: `Divida esta mensagem em partes naturais para WhatsApp:\n\n${text}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Split API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON array from response
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return splitByParagraph(text);

  try {
    const parts = JSON.parse(match[0]) as string[];
    if (!Array.isArray(parts) || parts.length === 0) return splitByParagraph(text);
    return parts.slice(0, MAX_PARTS);
  } catch {
    return splitByParagraph(text);
  }
}

/**
 * Fallback: split by double newlines (paragraphs).
 * Merges very short paragraphs together.
 */
function splitByParagraph(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  if (paragraphs.length <= 1) return [text];

  // Merge short paragraphs
  const merged: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (current && (current + "\n\n" + p).length > 500) {
      merged.push(current);
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) merged.push(current);

  return merged.slice(0, MAX_PARTS);
}

function calculatePartDelay(charCount: number): number {
  const delay = charCount * TYPING_DELAY_PER_CHAR_MS;
  return Math.min(Math.max(delay, MIN_PART_DELAY_MS), MAX_PART_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
