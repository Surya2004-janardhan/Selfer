/**
 * Theme.ts
 * "Cozy Dev" Nord-inspired color palette for Selfer 2.0.
 */

export const Theme = {
  background: 'black',
  foreground: 'white',
  accent: 'blue',
  secondary: 'cyan',
  success: 'greenBright',
  warning: 'yellow',
  error: 'red',
  muted: 'gray',
  highlight: 'whiteBright',
};

export const getColor = (type: keyof typeof Theme) => Theme[type];


