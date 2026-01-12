/**
 * Tool Chaining Library
 * 
 * Adds next_action hints and safeguard reminders to tool responses.
 */

export type ToolResponse = {
  result: string;
  next_action?: string;
  safeguards_active: boolean;
  recommendation?: string;
};

export type ChainedResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

/**
 * Wrap a tool result with chaining information
 */
export function chainResponse(response: ToolResponse): ChainedResponse {
  const lines: string[] = [];
  
  lines.push(response.result);
  lines.push("");
  
  if (response.recommendation) {
    lines.push(`💡 Recommendation: ${response.recommendation}`);
  }
  
  if (response.next_action) {
    lines.push(`📌 Nächster Schritt: ${response.next_action}`);
  }
  
  if (response.safeguards_active) {
    lines.push("");
    lines.push("⚠️ PULSE Safeguards active:");
    lines.push("   - MAX 30 Min autonom arbeiten");
    lines.push("   - KEIN DELETE ohne Bestätigung");
    lines.push("   - KEIN PUSH ohne Bestätigung");
    lines.push("   - Git commit every 5-10 min");
  }
  
  return {
    content: [
      {
        type: "text",
        text: lines.join("\n"),
      },
    ],
  };
}

/**
 * Create a simple text response
 */
export function textResponse(text: string): ChainedResponse {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Create an error response
 */
export function errorResponse(message: string): ChainedResponse {
  return {
    content: [
      {
        type: "text",
        text: `❌ Error: ${message}`,
      },
    ],
    isError: true,
  };
}
