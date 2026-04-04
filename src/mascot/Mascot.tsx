import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';

/**
 * Mascot.tsx
 * Interactive terminal mascot for Selfer.
 * (Inspired by the reference's 'buddy')
 */

export const SelferMascot: React.FC<{ state: 'idle' | 'thinking' | 'result' }> = ({ state }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const frames = {
    idle: ['( o_o )', '( -_- )', '( o_o )', '( ^_^ )'],
    thinking: ['( .   )', '(  .  )', '(   . )', '(  .  )'],
    result: ['( ^▿^ )', '( *o* )', '( ^▿^ )', '( ^_^ )']
  };

  return (
    <Box>
      <Text color="#00FF00" bold>
        {frames[state][frame]}
      </Text>
    </Box>
  );
};
