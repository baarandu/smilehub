/**
 * Message Splitter - Breaks long AI responses into natural WhatsApp-sized chunks.
 * Splits by paragraph boundaries, merging short paragraphs to avoid fragmentation.
 */

import * as evolution from "./evolutionClient.ts";

// Provider: Evolution API only (Meta path removed to eliminate ambiguity)
const whatsapp = evolution;

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

  // Split by paragraph boundaries (no extra API call)
  const parts = splitByParagraph(text);

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
