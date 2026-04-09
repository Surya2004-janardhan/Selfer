import React from 'react';
import { Box, Text, Newline } from 'ink';
import Spinner from 'ink-spinner';
import { Theme } from './Theme.js';

/**
 * TUIComponents.tsx
 * Premium UI components for Selfer CLI.
 * Alignment with Claude Code reference aesthetics.
 */

export const StatusPill: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <Box marginRight={2}>
    <Text color={Theme.muted}>{label}: </Text>
    <Text color={color || Theme.foreground}>{value}</Text>
  </Box>
);

export const ToolActivity: React.FC<{ name: string; status: 'running' | 'success' | 'error' }> = ({ name, status }) => {
  const icon = status === 'running' ? <Spinner type="dots" /> : status === 'success' ? '✓' : '✗';
  const color = status === 'running' ? Theme.accent : status === 'success' ? Theme.success : Theme.error;

  return (
    <Box marginX={1}>
      <Text color={color}>{icon} </Text>
      <Text color={Theme.muted}>{name}</Text>
    </Box>
  );
};

export const CodeBlock: React.FC<{ code: string; language?: string; title?: string }> = ({ code, language, title }) => (
  <Box flexDirection="column" marginY={1} borderStyle="round" borderColor={Theme.muted} paddingX={1}>
    {title && (
      <Box marginBottom={1}>
        <Text color={Theme.accent} bold>{title}</Text>
        {language && <Text color={Theme.muted}> ({language})</Text>}
      </Box>
    )}
    <Text color={Theme.foreground}>{code}</Text>
  </Box>
);

export const ThinkingProcess: React.FC<{ content: string }> = ({ content }) => (
  <Box flexDirection="column" borderStyle="single" borderColor={Theme.secondary} paddingX={1} marginY={1}>
    <Box>
      <Text color={Theme.secondary} bold>💭 THINKING </Text>
      <Spinner type="arc" />
    </Box>
    <Text color={Theme.muted} italic>{content}</Text>
  </Box>
);

export const DiffBlock: React.FC<{ diff: string }> = ({ diff }) => {
  const lines = diff.split('\n');
  return (
    <Box flexDirection="column" paddingX={1} marginY={1} borderStyle="bold" borderColor={Theme.warning}>
      <Text color={Theme.warning} bold>∆ CHANGES</Text>
      {lines.map((line, i) => {
        let color = Theme.foreground;
        if (line.startsWith('+')) color = Theme.success;
        if (line.startsWith('-')) color = Theme.error;
        if (line.startsWith('@@')) color = Theme.accent;
        
        return <Text key={i} color={color}>{line}</Text>;
      })}
    </Box>
  );
};
