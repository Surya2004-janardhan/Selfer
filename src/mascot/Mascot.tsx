import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import { Theme } from '../view/Theme.js';

/**
 * Mascot.tsx
 * "Cozy Dev" robot mascot for Selfer 2.0.
 */

export const SelferMascot: React.FC<{ state: 'idle' | 'thinking' | 'result' }> = ({ state }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 400); // Slower, more cozy animation
    return () => clearInterval(timer);
  }, []);

  const icons = {
    idle: ['[ ◕ᴗ◕ ]', '[ ◕◡◕ ]', '[ ◕ᴗ◕ ]', '[ ^ᴗ^ ]'],
    thinking: ['[ .   ]', '[  .  ]', '[   . ]', '[  .  ]'],
    result: ['[ ◕‿◕ ]', '[ *o* ]', '[ ◕‿◕ ]', '[ ^‿^ ]']
  };

  const getColor = () => {
    if (state === 'thinking') return Theme.accent;
    if (state === 'result') return Theme.success;
    return Theme.secondary;
  };

  return (
    <Box>
      <Text color={getColor()} bold>
        {icons[state][frame]}
      </Text>
    </Box>
  );
};
