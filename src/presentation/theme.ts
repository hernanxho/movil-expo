import { Platform } from 'react-native';

export const colors = {
  background: '#0D1524',
  card: '#152036',
  cardRaised: '#1C2A45',
  line: 'rgba(232,238,247,0.10)',
  text: '#E8EEF7',
  muted: 'rgba(232,238,247,0.58)',
  faint: 'rgba(232,238,247,0.28)',
  teal: '#4FD1B8',
  blue: '#6EA8FE',
  amber: '#F2B84B',
  red: '#F26B5B',
  violet: '#B49BFF',
};

export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function formatMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export function formatClock(timestamp: number): string {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}
