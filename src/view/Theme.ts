/**
 * Theme.ts
 * "Cozy Dev" Nord-inspired color palette for Selfer 2.0.
 */

export const Theme = {
  background: '#2E3440',
  foreground: '#D8DEE9',
  accent: '#88C0D0', // Frost Cyan
  secondary: '#81A1C1', // Frost Blue
  success: '#A3BE8C', // Aurora Green
  warning: '#EBCB8B', // Aurora Yellow
  error: '#BF616A', // Aurora Red
  muted: '#4C566A', // Polar Night Gray
  highlight: '#E5E9F0',
};

export const getColor = (type: keyof typeof Theme) => Theme[type];
