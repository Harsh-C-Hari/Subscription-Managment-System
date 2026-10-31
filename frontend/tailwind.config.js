/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chassis: 'var(--dp-color-chassis, #cbd0d2)',
        raised: 'var(--dp-color-raised, #e7eaeb)',
        well: 'var(--dp-color-well, #b6bec2)',
        ink: 'var(--dp-color-ink, #181e22)',
        label: 'var(--dp-color-label, #414b52)',
        field: 'var(--dp-color-field, #20272b)',
        'on-field': 'var(--dp-color-on-field, #f2f4f4)',
        'on-field-muted': 'var(--dp-color-on-field-muted, #d8dee1)',
        accent: 'var(--dp-color-accent, #f15b22)',
      },
      fontFamily: {
        sans: ['"Industrial Host"', '"Host Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Industrial Plex"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        key: '4px',
      },
      boxShadow: {
        raised: '0 1px 0 #ffffff inset, 0 -1px 0 #9ca3af inset, 0 2px 4px rgba(0, 0, 0, 0.12)',
        'raised-sm': '0 1px 0 #ffffff inset, 0 -1px 0 #9ca3af inset, 0 1px 2px rgba(0, 0, 0, 0.1)',
        'raised-hover': '0 1px 0 #ffffff inset, 0 -1px 0 #8f989c inset, 0 4px 6px rgba(0, 0, 0, 0.15)',
        'raised-active': '0 2px 4px rgba(0, 0, 0, 0.25) inset',
        well: 'inset 0 2px 4px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(0, 0, 0, 0.12), 0 1px 0 #ffffff',
        screen: 'inset 0 3px 6px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 255, 255, 0.35)',
        dial: '0 3px 8px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
      },
      transitionTimingFunction: {
        settle: 'cubic-bezier(0.3, 0.7, 0.4, 1.25)',
      },
      transitionDuration: {
        navigation: '130ms',
        key: '140ms',
        dial: '150ms',
      }
    },
  },
  plugins: [],
}
