/**
 * Sanitizador de inputs para modelos de IA
 * Modo log-only: detecta e registra tentativas de prompt injection,
 * mas NÃO bloqueia (para evitar falsos positivos em uso clínico).
 *
 * Pode ser promovido a modo bloqueante no futuro após análise dos logs.
 */

const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  {
    pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/gi,
    label: "ignore_instructions",
  },
  {
    pattern: /new\s+(system\s+)?prompt\s*:/gi,
    label: "new_system_prompt",
  },
  {
    pattern: /you\s+are\s+now\s+(a|an)\s+/gi,
    label: "role_override",
  },
  {
    pattern: /\bsystem\s*:\s*you\s+are/gi,
    label: "system_role_injection",
  },
  {
    pattern: /forget\s+(all\s+)?(your|previous)\s+(instructions|training|rules)/gi,
    label: "forget_instructions",
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|context)/gi,
    label: "disregard_instructions",
  },
  {
    pattern: /\bdo\s+not\s+follow\s+(the\s+)?(previous|above|system)\s+(instructions|prompt)/gi,
    label: "do_not_follow",
  },
  {
    pattern: /\breturn\s+(all|the)\s+(api|secret|private)\s+(keys?|tokens?|credentials?)/gi,
    label: "credential_extraction",
  },
];

export interface SanitizeResult {
  text: string;
  suspicious: boolean;
  matchedPatterns: string[];
}

export function checkForInjection(
  input: string,
  context: { functionName: string; userId?: string; clinicId?: string }
): SanitizeResult {
  const matchedPatterns: string[] = [];

  for (const { pattern, label } of INJECTION_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      matchedPatterns.push(label);
    }
  }

  const suspicious = matchedPatterns.length > 0;

  if (suspicious) {
    // Log-only mode: register the attempt but don't block
    console.warn(
      `[ai-sanitizer][${context.functionName}] Suspicious input detected.`,
      JSON.stringify({
        patterns: matchedPatterns,
        userId: context.userId || "unknown",
        clinicId: context.clinicId || "unknown",
        inputLength: input.length,
        // Log first 200 chars for analysis (no full input to avoid log pollution)
        inputPreview: input.slice(0, 200),
      })
    );
  }

  return {
    text: input, // Pass through unchanged in log-only mode
    suspicious,
    matchedPatterns,
  };
}
