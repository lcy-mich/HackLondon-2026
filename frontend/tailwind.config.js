/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Override Tailwind's default font-serif stack to lead with Playfair Display.
        // All other themes still get the system serif fallback chain.
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      colors: {
        // Semantic palette — each value references the active CSS-variable theme.
        // Usage: bg-surface, text-primary, border-muted, bg-free, bg-accent, etc.
        //
        // NOTE: Because these are plain CSS variable references (not RGB channels),
        // Tailwind's opacity-modifier syntax (e.g. bg-accent/50) will not work.
        // Use explicit CSS opacity or a wrapping element instead.
        main:        'var(--bg-main)',
        surface:     'var(--bg-surface)',
        header:      'var(--bg-header)',
        'header-fg': 'var(--text-header)',
        primary:     'var(--text-primary)',
        secondary:   'var(--text-secondary)',
        free:        'var(--color-free)',
        reserved:    'var(--color-reserved)',
        accent:      'var(--color-accent)',
        muted:       'var(--border-muted)',
      },
    },
  },
  plugins: [],
}
