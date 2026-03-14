/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require("nativewind/preset")],
    content: [
        "./App.{js,jsx,ts,tsx}", // Đảm bảo có cả file App ở gốc
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#EFFF3B', // Vàng Neon (Màu nhấn chính)
                    secondary: '#0a0a0a', // Đen nền
                    tertiary: '#1c1c1c', // Xám nền input/card
                },
                text: {
                    primary: '#FFFFFF', // Trắng cho tiêu đề/văn bản chuẩn
                    secondary: '#666666', // Xám nhạt cho icon/văn bản phụ
                    muted: '#999999', // Xám khi unchecked hay bị làm mờ
                },
                border: {
                    default: '#333333', // Viền thẻ/input
                    focus: '#EFFF3B', // Viền khi focus (Trùng màu primary)
                },
                status: {
                    success: '#4ADE80',
                    warning: '#FACC15',
                    danger: '#F87171',
                    info: '#38BDF8',
                },
                dashboard: {
                    bg: '#FAFAFA',
                    card: '#FFFFFF',
                    accent: {
                        green: '#DDF7A1',
                        progress: '#98E332',
                        orange: '#FF914D',
                        blue: '#38BDF8',
                    }
                }
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '1.875rem',
            }
        },
    },
    plugins: [],
}