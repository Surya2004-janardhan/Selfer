/**
 * TokenEstimator.ts
 * Utility for estimating token counts for Anthropic and OpenAI models.
 * (Inspired by src-reference tokenEstimation.ts)
 */

export class TokenEstimator {
  /**
   * Roughly estimate token counts based on standard heuristics.
   * Approx. 1 token per 4 characters for English text.
   */
  static estimate(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Accumulate tokens across an array of messages.
   */
  static estimateTotal(messages: { content: string }[]): number {
    return messages.reduce((acc, msg) => acc + this.estimate(msg.content), 0);
  }
}
