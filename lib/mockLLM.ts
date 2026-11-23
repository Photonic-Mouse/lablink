export interface MockLlmResult {
  explanation: string;
  score: number;
}

export async function explainBooking(): Promise<MockLlmResult> {
  return {
    explanation:
      "Mock LLM fallback: deterministic explanation generated without a provider.",
    score: 0,
  };
}
