import { z } from 'zod';
import axios from 'axios';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class WebFetchSkill extends BaseSkill {
  name = 'WebFetch';
  description = 'Skill for performing web searches and fetching page content.';

  schema = z.object({
    action: z.enum(['search', 'fetch']),
    query: z.string().optional().describe('Input for search action.'),
    url: z.string().optional().describe('Input for fetch action.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      if (input.action === 'fetch' && input.url) {
        const response = await axios.get(input.url, {
          timeout: 10000,
          maxRedirects: 5,
          headers: { 'User-Agent': 'selfer/3.1' }
        });
        const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const normalized = raw.replace(/\s+/g, ' ').trim();
        return {
          content: `Fetched ${input.url} (status ${response.status}):\n${normalized.slice(0, 6000)}`,
          isError: false
        };
      }
      
      if (input.action === 'search' && input.query) {
        const q = encodeURIComponent(input.query);

        // Try DDG instant answer first (free, no API key)
        try {
          const ddg = await axios.get(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`, {
            timeout: 8000,
            headers: { 'User-Agent': 'selfer/3.1' }
          });
          const data = ddg.data || {};
          const abstractText = data.AbstractText || '';
          const abstractUrl = data.AbstractURL || '';
          const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics.slice(0, 5) : [];

          const lines: string[] = [];
          lines.push(`Search results for "${input.query}"`);
          if (abstractText) {
            lines.push(`- Summary: ${abstractText}`);
          }
          if (abstractUrl) {
            lines.push(`- Source: ${abstractUrl}`);
          }

          for (const item of related) {
            if (item?.Text && item?.FirstURL) {
              lines.push(`- ${item.Text} (${item.FirstURL})`);
            } else if (Array.isArray(item?.Topics)) {
              for (const t of item.Topics.slice(0, 2)) {
                if (t?.Text && t?.FirstURL) lines.push(`- ${t.Text} (${t.FirstURL})`);
              }
            }
          }

          if (lines.length > 1) {
            return { content: lines.join('\n'), isError: false };
          }
        } catch {
          // Fallback to Wikipedia open search below
        }

        // Fallback: Wikipedia opensearch API
        const wiki = await axios.get(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=5&namespace=0&format=json`, {
          timeout: 8000,
          headers: { 'User-Agent': 'selfer/3.1' }
        });
        const [, titles, , urls] = wiki.data as [string, string[], string[], string[]];
        if (!titles || titles.length === 0) {
          return { content: `No search results found for "${input.query}".`, isError: false };
        }

        const resultLines = titles.map((title, i) => `- ${title} (${urls[i] || 'no-url'})`);
        return {
          content: `Search results for "${input.query}":\n${resultLines.join('\n')}`,
          isError: false
        };
      }
      
      throw new Error('Action missing input data.');
    } catch (error: any) {
      return { content: `WebScout Error: ${error.message}`, isError: true };
    }
  }
}
