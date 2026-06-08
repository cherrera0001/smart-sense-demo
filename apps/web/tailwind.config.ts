import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand: Home Energy
        'brand-primary': '#FF8A00',
        'brand-primary-dark': '#E67600',
        'brand-primary-soft': '#FFF2E5',

        // NEW ELEGANT PALETTE (3 layers + refinement)
        // Layer 0: Deep background
        'bg-deep': '#0A0F1B',
        // Layer 1: Primary surface (cards)
        'surface-primary': '#131D2E',
        // Layer 2: Elevated (hover, active)
        'surface-secondary': '#1A2437',

        // Text refinement
        'text-primary': '#F8F9FB',
        'text-secondary': '#B0BAC6',
        'text-tertiary': '#8A94A6',

        // Legacy compatibility & backwards
        'text-on-dark': '#F8F9FB',
        'text-dim-on-dark': '#B0BAC6',
        'bg-light': '#F5F7FA',
        'card-light': '#FFFFFF',
        'text-dark': '#0F172A',
        'text-dim': '#475569',

        // Old palette (kept for compatibility)
        ink: '#0A0F1B',
        'ink-2': '#131D2E',
        'ink-3': '#1A2437',
        'surface-card': '#131D2E',
        energy: '#FF8A00',
        'energy-dk': '#E67600',
        gold: '#FFC844',
        electric: '#5B7FFF',
        warn: '#FF6B6B',

        // Severity colors (soft, elegant refinement)
        'severity-critical': '#F87171',      // Soft red
        'severity-critical-light': '#FEE2E2',
        'severity-warning': '#FBBF24',       // Refined amber
        'severity-warning-light': '#FEF3C7',
        'severity-info': '#60A5FA',          // Professional blue
        'severity-info-light': '#EFF6FF',

        // Semantic colors (updated refinement)
        success: '#10B981',
        'success-dark': '#059669',
        'success-light': '#D1FAE5',
        warning: '#FBBF24',
        'warning-dark': '#D97706',
        'warning-light': '#FEF3C7',
        error: '#F87171',
        'error-dark': '#DC2626',
        'error-light': '#FEE2E2',
        info: '#60A5FA',
        'info-dark': '#2563EB',
        'info-light': '#EFF6FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', letterSpacing: '0.3px' }],
        sm: ['13px', { lineHeight: '18px', letterSpacing: '0.2px' }],
        base: ['15px', { lineHeight: '22px', letterSpacing: '0px' }],
        lg: ['17px', { lineHeight: '26px', letterSpacing: '-0.2px' }],
        xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.3px' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.5px' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.08)',
        sm: '0 2px 6px 0 rgba(0, 0, 0, 0.12)',
        md: '0 4px 16px 0 rgba(0, 0, 0, 0.16)',
        lg: '0 8px 32px 0 rgba(0, 0, 0, 0.20)',
        xl: '0 16px 48px 0 rgba(0, 0, 0, 0.24)',
        interactive: '0 1px 3px 0 rgba(255, 138, 0, 0.15)',
      },
      spacing: {
        0: '0',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
}
export default config
