import React, { useState } from 'react';
import { Text, Box, Newline } from 'ink';
import TextInput from 'ink-text-input';
import { SelferMascot } from '../mascot/Mascot.js';
import { ThinkingCore } from '../ThinkingCore.js';
import { CommandRegistry } from '../actions/CommandRegistry.js';
import { Theme } from './Theme.js';

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

export const App: React.FC<AppProps> = ({ core, registry, modelName, providerName }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [state, setState] = useState<'idle' | 'thinking' | 'result'>('idle');
  const [totalTokens, setTotalTokens] = useState(0);

  const handleSubmit = async () => {
    if (!query) return;
    const currentQuery = query;
    setQuery('');

    // Handle Slash Commands
    const actionResult = await registry.run(currentQuery);
    if (actionResult) {
      setMessages((prev) => [...prev, { role: 'user', content: currentQuery }]);
      setMessages((prev) => [...prev, { role: 'assistant', content: actionResult }]);
      setState('result');
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: currentQuery }]);
    setState('thinking');
    
    // Core submission loop
    try {
      const generator = core.submitMessage(currentQuery);
      for await (const chunk of generator) {
        if (chunk.type === 'assistant') {
          setMessages((prev) => [...prev, { role: 'assistant', content: chunk.content }]);
          if (chunk.tokens) setTotalTokens(t => t + chunk.tokens);
          setState('result');
        }
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: 'error', content: error.message }]);
      setState('idle');
    }
  };

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
                <Text color={Theme.accent} bold>SELFER v2.2.0</Text>
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
                <Text color={msg.role === 'error' ? Theme.error : Theme.foreground}>{msg.content}</Text>
            </Box>
          </Box>
        ))}
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
