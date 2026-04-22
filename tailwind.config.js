/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./public/**/*.{html,js}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            colors: {
                'midnight': '#0f172a',
                'midnight-lighter': '#1e293b',
                'accent-cyan': '#06b6d4',
                'accent-indigo': '#6366f1',
                'accent-violet': '#8b5cf6',
                'income': '#10b981',
                'expense': '#f43f5e',
                'glass-border': 'rgba(255, 255, 255, 0.08)',
                'glass-bg': 'rgba(30, 41, 59, 0.4)',
            },
            fontFamily: {
                'prompt': ['Prompt', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            },
            backdropBlur: {
                'glass': '16px',
            },
            borderRadius: {
                'glass': '24px',
            },
            boxShadow: {
                'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
                'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glass-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            }
        },
    },
    plugins: [],
}
