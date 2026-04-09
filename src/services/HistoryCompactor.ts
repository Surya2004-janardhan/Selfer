import { SelferMessage } from '../ThinkingCore.js';
import { TokenEstimator } from '../utils/TokenEstimator.js';
import { BaseProvider } from '../providers/BaseProvider.js';

/**
 * HistoryCompactor.ts
 * Service for context scaling via intelligent summarization (compaction).
 * Parity with reference services/compact logic.
 */
export class HistoryCompactor {
  private static MAX_CONTEXT_TOKENS = 12000; // Threshold to trigger compaction
  private static RETAIN_LAST_N = 6;         // Number of recent turns to always keep raw

  /**
   * Compacts history if it exceeds the token limit.
   */
  static async compact(
    history: SelferMessage[], 
    provider: BaseProvider,
    model: string
  ): Promise<SelferMessage[]> {
    const totalTokens = TokenEstimator.estimateTotal(history);
    
    if (totalTokens < this.MAX_CONTEXT_TOKENS || history.length <= this.RETAIN_LAST_N + 2) {
      return history;
    }

    // Identify parts to summarize and parts to keep
    const systemMessage = history.find(m => m.role === 'system');
    const toCompact = history.slice(systemMessage ? 1 : 0, -this.RETAIN_LAST_N);
    const toKeep = history.slice(-this.RETAIN_LAST_N);

    if (toCompact.length === 0) return history;

    // Generate Summary
    const summaryPrompt = `Please provide a concise but comprehensive summary of the preceding conversation history.
Focus on:
1. The main objective the user is trying to achieve.
2. Decisions made and actions taken.
3. Relevant state or variables discovered.
Keep the summary technical and brief.`;

    const summaryMessages = [
      ...toCompact,
      { role: 'user', content: summaryPrompt, timestamp: new Date().toISOString() }
    ];

    try {
      const generator = provider.generate(summaryMessages as any, []);
      let summaryContent = '';
      
      for await (const chunk of generator) {
        if (chunk.type === 'content') {
          summaryContent += chunk.content;
        }
      }

      const compactedMessage: SelferMessage = {
        role: 'system',
        content: `[CONTEXT COMPACTED] Summary of previous conversation:\n${summaryContent}`,
        timestamp: new Date().toISOString()
      };

      const result = [];
      if (systemMessage) result.push(systemMessage);
      result.push(compactedMessage);
      result.push(...toKeep);

      return result;
    } catch (error) {
      console.error('Compaction failed, falling back to truncation:', error);
      // Fallback: just return the kept part
      const result = [];
      if (systemMessage) result.push(systemMessage);
      result.push(...toKeep);
      return result;
    }
  }
}
