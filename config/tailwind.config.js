tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slight': 'bounce-slight 2s infinite',
                'spin-slow': 'spin 6s linear infinite',
            },
            keyframes: {
                'bounce-slight': {
                    '0%, 100%': { transform: 'translateY(-5%)' },
                    '50%': { transform: 'translateY(0)' },
                }
            }
        }
    }
}
