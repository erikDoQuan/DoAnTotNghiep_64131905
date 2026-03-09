/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}", // Đảm bảo có cả file App ở gốc
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Màu chủ đạo cho Health App (Xanh Teal/Mint)
                primary: {
                    light: '#5EEAD4',
                    DEFAULT: '#2DD4BF',
                    dark: '#0F766E',
                },
                // Màu bổ trợ cho Vận động/Calo (Cam/Vàng)
                secondary: {
                    light: '#FDBA74',
                    DEFAULT: '#FB923C',
                    dark: '#EA580C',
                },
                // Màu trạng thái sức khỏe (Dùng cho BMI/Cảnh báo)
                success: '#4ADE80', // Xanh lá - Bình thường
                warning: '#FACC15', // Vàng - Thừa cân
                danger: '#F87171',  // Đỏ - Béo phì
                info: '#38BDF8',    // Xanh dương - Nước/Giấc ngủ

                // Màu nền trung tính
                background: '#F8FAFC',
                surface: '#FFFFFF',
                textMain: '#1E293B',
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            }
        },
    },
    plugins: [],
}