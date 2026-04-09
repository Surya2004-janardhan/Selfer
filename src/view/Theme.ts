/**
 * Theme.ts
 * "Cozy Dev" Nord-inspired color palette for Selfer 2.0.
 */

export const Theme = {
  background: '#0D1117', // Darker background
  foreground: '#C9D1D9',
  accent: '#58A6FF', // GitHub Dark Blue
  secondary: '#1F6FEB', // Deeper Blue
  success: '#3FB950', // Bash Light Green
  warning: '#D29922',
  error: '#F85149',
  muted: '#484F58',
  highlight: '#E6EDF3',
};

export const getColor = (type: keyof typeof Theme) => Theme[type];
