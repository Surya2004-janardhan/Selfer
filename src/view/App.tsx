import React, { useState } from 'react';
import { Text, Box } from 'ink';
import TextInput from 'ink-text-input';
import { SelferMascot } from '../mascot/Mascot.js';
import { ThinkingCore } from '../ThinkingCore.js';
import { CommandRegistry } from '../actions/CommandRegistry.js';
import { Theme } from './Theme.js';
import { useInput } from 'ink';
import { ThinkingProcess, DiffBlock, CodeBlock, StatusPill, ToolActivity } from './TUIComponents.js';

/**
 * App.tsx
 * "Cozy Dev" Redesign for Selfer 2.0.
 * Clean, Nord-themed, and developer-focused.
 */

interface AppProps {
  core: ThinkingCore;
  registry: CommandRegistry;
  modelName: string;
  providerName: string;
}

interface UIMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

interface ToolEvent {
  name: string;
  status: 'running' | 'success' | 'error';
}

export const App: React.FC<AppProps> = ({ core, registry, modelName, providerName }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [state, setState] = useState<'idle' | 'thinking' | 'result'>('idle');
  const [thinkingContent, setThinkingContent] = useState('');
  const [totalTokens, setTotalTokens] = useState(0);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);

  const refreshUsage = () => {
    const stats = core.getCostStats();
    setTotalTokens((stats.totalInput || 0) + (stats.totalOutput || 0));
  };

  const extractToolName = (content: string): string => {
    const runMatch = content.match(/(?:Running|Preparing)\s+([^\.]+)\.{3}/i);
    const finishMatch = content.match(/Finished\s+([^\.]+)\./i);
    return runMatch?.[1] || finishMatch?.[1] || 'UnknownTool';
  };

  const handleSubmit = async () => {
    const currentQuery = query.trim();
    if (!currentQuery) return;
    setQuery('');
    setToolEvents([]);
    setThinkingContent('');

    // Handle Slash Commands
    try {
      const actionResult = await registry.run(currentQuery);
      if (actionResult) {
        setMessages((prev) => [...prev, { role: 'user', content: currentQuery }]);
        setMessages((prev) => [...prev, { role: 'assistant', content: actionResult }]);
        setState('result');
        refreshUsage();
        return;
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: currentQuery },
        { role: 'error', content: `Command failed: ${err?.message || 'Unknown error'}` }
      ]);
      setState('result');
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: currentQuery }]);
    setState('thinking');
    
    // Create an empty assistant message to stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    
    // Core submission loop
    try {
      const generator = core.submitMessage(currentQuery);
      for await (const chunk of generator) {
        if (chunk.type === 'chunk') {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, content: last.content + chunk.content };
              return updated;
            }
            return prev;
          });
        } else if (chunk.type === 'tool_call') {
          const name = extractToolName(chunk.content || '');
          setToolEvents((prev) => {
            const next = prev.filter(e => e.name !== name);
            return [...next, { name, status: 'running' }];
          });
        } else if (chunk.type === 'tool_result') {
          const name = extractToolName(chunk.content || '');
          setToolEvents((prev) => prev.map(e => e.name === name ? { ...e, status: 'success' } : e));
        } else if (chunk.type === 'error') {
          setMessages((prev) => [...prev, { role: 'error', content: chunk.content || 'An unknown error occurred.' }]);
        } else if (chunk.type === 'thinking') {
          setThinkingContent((prev) => prev + chunk.content);
        }

        refreshUsage();
      }
      setState('result');
    } catch (error: any) {
      if (error.name === 'AbortError') {
          // Already handled in ThinkingCore yielding "Aborted"
      } else {
          setMessages((prev) => [...prev, { role: 'error', content: `Request failed: ${error?.message || 'Unknown error'}` }]);
      }
      setState('result');
    } finally {
      setToolEvents((prev) => prev.map(e => e.status === 'running' ? { ...e, status: 'error' } : e));
      refreshUsage();
    }
  };

  // Phase 5: Interruptibility (Esc to Abort)
  useInput((input, key) => {
    if (key.escape && state === 'thinking') {
      core.abort();
      setState('result');
    }
  });

  const getMessageColor = (role: string) => {
    if (role === 'user') return Theme.accent;
    if (role === 'error') return Theme.error;
    return Theme.success;
  };

  const getMessagePrefix = (role: string) => {
    if (role === 'user') return 'λ USER ';
    if (role === 'error') return '✘ ERROR ';
    return 'δ SELFER ';
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Top Status Bar (Cozy Dev style) */}
      <Box borderStyle="single" borderColor={Theme.muted} paddingX={1} marginBottom={1} justifyContent="space-between">
        <Box>
            <SelferMascot state={state === 'idle' && messages.some(m => m.role === 'error') ? 'idle' : state} />
            <Box marginLeft={2}>
                <Text color={Theme.accent} bold>SELFER v3.1.0</Text>
                <Text color={Theme.muted}> │ </Text>
                <Text color={Theme.secondary}>{providerName.toUpperCase()}</Text>
                <Text color={Theme.muted}> › </Text>
                <Text color={Theme.foreground}>{modelName}</Text>
            </Box>
        </Box>
        <Box>
            <Text color={Theme.warning}>● </Text>
            <Text color={Theme.foreground}>{totalTokens} tokens</Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <StatusPill label="Session" value={state.toUpperCase()} color={state === 'thinking' ? Theme.accent : Theme.success} />
        <StatusPill label="Messages" value={String(messages.length)} color={Theme.secondary} />
        <StatusPill label="Tools" value={String(toolEvents.length)} color={Theme.warning} />
      </Box>

      {toolEvents.length > 0 && (
        <Box borderStyle="round" borderColor={Theme.muted} paddingX={1} marginBottom={1}>
          <Text color={Theme.muted}>Tool activity: </Text>
          {toolEvents.map((event) => (
            <ToolActivity key={event.name} name={event.name} status={event.status} />
          ))}
        </Box>
      )}

      {/* Message History */}
      <Box flexDirection="column" minHeight={5}>
        {messages.length === 0 && (
            <Box padding={2} justifyContent="center" alignItems="center">
                <Text color={Theme.muted} italic>No activity yet. Start by asking Selfer a question...</Text>
            </Box>
        )}
        {messages.map((msg, i) => (
          <Box key={i} marginBottom={1} flexDirection="column">
            <Box>
                <Text color={getMessageColor(msg.role)} bold>
                {getMessagePrefix(msg.role)}
                </Text>
                <Text color={Theme.muted}>—</Text>
            </Box>
            <Box marginLeft={2} paddingY={0}>
                {msg.role === 'assistant' && msg.content === '' && state === 'thinking' ? (
                    <Text color={Theme.muted} italic>Streaming...</Text>
                ) : (
                msg.content.includes('--- diff') ? <DiffBlock diff={msg.content} /> :
                msg.content.includes('```') ? <CodeBlock code={msg.content} title="Assistant Output" /> :
                <Text color={msg.role === 'error' ? Theme.error : Theme.foreground}>{msg.content}</Text>
                )}
            </Box>
          </Box>
        ))}
        {thinkingContent && <ThinkingProcess content={thinkingContent} />}
      </Box>

      {/* Input Area */}
      <Box marginTop={1} flexDirection="column">
        <Box borderStyle="round" borderColor={state === 'thinking' ? Theme.accent : Theme.muted} paddingX={1}>
            <Text color={Theme.accent} bold>❯ </Text>
            <TextInput 
            value={query} 
            onChange={setQuery} 
            onSubmit={handleSubmit} 
            placeholder="Type your command..."
            focus={state !== 'thinking'}
            />
        </Box>
        <Box marginLeft={1}>
            <Text color={Theme.muted}>Use /help for commands</Text>
        </Box>
      </Box>
    </Box>
  );
};
