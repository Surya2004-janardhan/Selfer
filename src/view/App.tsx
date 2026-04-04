import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { SelferMascot } from '../mascot/Mascot.js';
import { ThinkingCore } from '../ThinkingCore.js';

/**
 * App.tsx
 * Main interactive TUI for Project Selfer.
 * Custom Green/Blue theme with matrix animations.
 */

interface AppProps {
  core: ThinkingCore;
}

export const App: React.FC<AppProps> = ({ core }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [state, setState] = useState<'idle' | 'thinking' | 'result'>('idle');

  const handleSubmit = async () => {
    if (!query) return;
    const currentQuery = query;
    setQuery('');
    setState('thinking');
    
    // Core submission loop
    const generator = core.submitMessage(currentQuery);
    for await (const chunk of generator) {
      if (chunk.type === 'assistant') {
        setMessages((prev) => [...prev, { role: 'assistant', content: chunk.content }]);
        setState('result');
      }
    }
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="#0000FF">
      {/* Header */}
      <Box marginBottom={1}>
        <SelferMascot state={state} />
        <Box marginLeft={2}>
          <Text color="#00FF00" bold>SELFER v1.0.0</Text>
        </Box>
      </Box>

      {/* Message History */}
      <Box flexDirection="column">
        {messages.map((msg, i) => (
          <Box key={i} marginBottom={1}>
            <Text color={msg.role === 'user' ? '#00FFFF' : '#00FF00'}>
              {msg.role === 'user' ? '👤 YOU: ' : '🤖 SELFER: '} {msg.content}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Input Field */}
      <Box marginTop={1}>
        <Text color="#00FF00">❯ </Text>
        <TextInput 
          value={query} 
          onChange={setQuery} 
          onSubmit={handleSubmit} 
          placeholder="Ask Selfer something... (e.g. /pulse or /disk)"
        />
      </Box>
    </Box>
  );
};
