# BÁO CÁO ĐỒ ÁN TỐT NGHIỆP
# ỨNG DỤNG THEO DÕI SỨC KHOẺ — LIFETRACK

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Cơ sở dữ liệu (Supabase)](#4-cơ-sở-dữ-liệu-supabase)
5. [Xác thực & Onboarding](#5-xác-thực--onboarding)
6. [Tính năng Theo dõi bước chân](#6-tính-năng-theo-dõi-bước-chân)
7. [Tính năng Theo dõi dinh dưỡng (Bữa ăn)](#7-tính-năng-theo-dõi-dinh-dưỡng-bữa-ăn)
8. [Tính năng Theo dõi giấc ngủ](#8-tính-năng-theo-dõi-giấc-ngủ)
9. [Tính năng Theo dõi cân nặng & BMI](#9-tính-năng-theo-dõi-cân-nặng--bmi)
10. [Tính năng Uống nước](#10-tính-năng-uống-nước)
11. [Màn hình Dashboard (Trang chủ)](#11-màn-hình-dashboard-trang-chủ)
12. [Màn hình Thống kê](#12-màn-hình-thống-kê)
13. [Thông báo & Nhắc nhở](#13-thông-báo--nhắc-nhở)
14. [Cài đặt & Hồ sơ người dùng](#14-cài-đặt--hồ-sơ-người-dùng)
15. [Quản lý trạng thái (State Management)](#15-quản-lý-trạng-thái-state-management)
16. [Cấu trúc thư mục & File](#16-cấu-trúc-thư-mục--file)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Giới thiệu

**LifeTrack** là ứng dụng di động theo dõi sức khoẻ toàn diện, được xây dựng bằng **React Native / Expo**. Ứng dụng giúp người dùng theo dõi và quản lý các chỉ số sức khoẻ hàng ngày gồm:

- Bước chân và hoạt động thể chất
- Dinh dưỡng và bữa ăn
- Giấc ngủ
- Cân nặng và chỉ số BMI
- Lượng nước uống

### 1.2 Thông tin chung

| Thông tin | Chi tiết |
|---|---|
| Tên ứng dụng | LifeTrack |
| Phiên bản | 1.0.0 |
| Nền tảng | iOS, Android |
| Ngôn ngữ lập trình | TypeScript |
| Ngôn ngữ giao diện | Tiếng Việt |
| Bundle ID (iOS) | com.anonymous.LifeTrack |
| Backend | Supabase (PostgreSQL) |

### 1.3 Các tính năng chính

| Tính năng | Mô tả |
|---|---|
| Đăng ký / Đăng nhập | Xác thực email/password qua Supabase Auth |
| Onboarding | Thu thập thông tin sức khoẻ ban đầu (chiều cao, cân nặng, giới tính...) |
| Bước chân | Đếm bước thời gian thực từ cảm biến thiết bị, lưu DB |
| Bữa ăn | Tìm kiếm và ghi nhận thực phẩm, tính macro dinh dưỡng |
| Giấc ngủ | Ghi nhận giờ ngủ/thức, phân tích chất lượng giấc ngủ |
| Cân nặng | Ghi nhận cân nặng theo ngày, tính BMI, đặt mục tiêu |
| Uống nước | Nhắc nhở 8 lần/ngày, xác nhận từng ly, thưởng khi đủ 8 ly |
| Thống kê | Biểu đồ 7/30 ngày cho tất cả chỉ số |
| Thông báo | Nhắc nhở uống nước và đi ngủ có thể tuỳ chỉnh |

---

## 2. CÔNG NGHỆ SỬ DỤNG

### 2.1 Frontend Framework

#### React Native & Expo (SDK 54)
- **React Native 0.81.5** — Thư viện xây dựng UI native cho iOS/Android bằng JavaScript/TypeScript
- **Expo SDK 54.0.33** — Nền tảng mở rộng React Native, cung cấp các API device (camera, sensor, notification...)
- **Expo Router** — Hệ thống điều hướng dựa trên file (file-based routing), tương tự Next.js nhưng cho mobile
- **React 19.1.0** — Phiên bản React với React Compiler (tự động tối ưu re-render)

```
Cấu trúc điều hướng Expo Router:
app/
  _layout.tsx         ← Root layout, bọc AuthProvider
  (tabs)/
    _layout.tsx       ← Tab navigator
    dashboard.tsx     ← Tab 1
    explore.tsx       ← Tab 2
    menu.tsx          ← Tab 3
  auth/auth_screen.tsx
  profile.tsx
  ...
```

#### NativeWind v4 (Tailwind CSS cho React Native)
- Cho phép dùng class Tailwind (`className="flex-1 bg-black p-4"`) trực tiếp trong component
- Cấu hình màu sắc tuỳ chỉnh trong `tailwind.config.js`:

```js
// tailwind.config.js — bảng màu tuỳ chỉnh
colors: {
  brand: {
    primary:   '#EFFF3B',  // Vàng neon — màu chủ đạo
    secondary: '#0a0a0a',  // Đen
    tertiary:  '#1c1c1c',  // Xám tối
  },
  status: {
    success: '#4ADE80',    // Xanh lá
    warning: '#FACC15',    // Vàng
    danger:  '#F87171',    // Đỏ
    info:    '#38BDF8',    // Xanh dương
  },
  dashboard: {
    bg: '#FAFAFA',         // Trắng nhạt — nền dashboard
  }
}
```

### 2.2 Backend — Supabase

**Supabase** là nền tảng Backend-as-a-Service (BaaS) mã nguồn mở, cung cấp:
- **PostgreSQL Database** — Lưu trữ toàn bộ dữ liệu người dùng
- **Supabase Auth** — Xác thực email/password, quản lý session, JWT tokens
- **Row Level Security (RLS)** — Mỗi user chỉ đọc/ghi được dữ liệu của chính mình
- **Realtime** — (Không dùng trong app này)
- **Auto-generated REST API** — Truy vấn DB qua Supabase JS client

Cấu hình kết nối (`supabase/supabaseClient.js`):

```js
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,        // Lưu session vào AsyncStorage
    autoRefreshToken: true,       // Tự động gia hạn token
    persistSession: true,         // Giữ session qua lần khởi động lại
    detectSessionInUrl: false,    // Không cần URL scheme
  },
});
```

### 2.3 Đếm bước chân — expo-sensors (Pedometer)

Đây là công nghệ cốt lõi cho tính năng bước chân:

#### Trên iOS — Core Motion Framework
- Sử dụng **CMPedometer** (Core Motion) của Apple
- Đọc dữ liệu từ M-series coprocessor (chip tăng tốc chuyển động)
- **Cùng nguồn dữ liệu với ứng dụng Fitness/Health của iPhone**
- Yêu cầu quyền: `NSMotionUsageDescription` trong `Info.plist`

#### Trên Android — Activity Recognition API
- Sử dụng **Step Detector / Step Counter** của Google Play Services
- Yêu cầu quyền: `ACTIVITY_RECOGNITION`

#### API được sử dụng:
```ts
import { Pedometer } from 'expo-sensors';

// Kiểm tra thiết bị có hỗ trợ không
const { granted } = await Pedometer.requestPermissionsAsync();
const isAvailable = await Pedometer.isAvailableAsync();

// Lấy số bước từ một mốc thời gian đến hiện tại
const result = await Pedometer.getStepCountAsync(start, end);

// Subscribe realtime — nhận cập nhật liên tục khi bước
const subscription = Pedometer.watchStepCount(result => {
  // result.steps = số bước tăng thêm kể từ khi subscribe
});
```

### 2.4 Thông báo — expo-notifications

```ts
import * as Notifications from 'expo-notifications';

// Lên lịch nhắc nhở hàng ngày lúc 22:00
await Notifications.scheduleNotificationAsync({
  content: { title: 'Đến giờ ngủ rồi!', body: '...' },
  trigger: {
    type: SchedulableTriggerInputTypes.DAILY,
    hour: 22, minute: 0,
  },
});
```

### 2.5 Lưu trữ cục bộ — AsyncStorage

Dùng `@react-native-async-storage/async-storage` cho dữ liệu không cần đồng bộ server:
- `water_confirmed` — Số ly nước đã xác nhận trong ngày (+ ngày)
- `water_reminders_enabled` — Bật/tắt nhắc uống nước

### 2.6 UI Components

| Thư viện | Công dụng |
|---|---|
| `@expo/vector-icons` (MaterialCommunityIcons) | Tất cả icon trong app |
| `@react-native-community/datetimepicker` | Chọn ngày/giờ native (iOS/Android) |
| `react-native-svg` | Vẽ vòng tròn tiến trình (Activity Ring) |
| `expo-haptics` | Rung phản hồi khi tương tác |
| `react-native-reanimated` | Animation nâng cao |
| `react-native-safe-area-context` | Xử lý notch/safe area trên iOS |

---

## 3. KIẾN TRÚC HỆ THỐNG

### 3.1 Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────┐
│                  LifeTrack App                   │
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ AuthContext  │    │   expo-notifications  │   │
│  │ (session,    │    │   (water + sleep      │   │
│  │  profile)    │    │    reminders)         │   │
│  └──────┬───────┘    └──────────────────────┘   │
│         │                                        │
│  ┌──────▼───────────────────────────────────┐   │
│  │              Expo Router                  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │Dashboard│ │ Explore  │ │  Menu    │  │   │
│  │  │(tabs)   │ │(tabs)    │ │(tabs)    │  │   │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘  │   │
│  │       │           │            │         │   │
│  │  Detail Screens (weight, steps, sleep...) │   │
│  └──────────────────────────────────────────┘   │
│                       │                          │
│  ┌────────────────────▼─────────────────────┐   │
│  │           Supabase JS Client              │   │
│  │  (Auth + PostgreSQL queries)              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │   Supabase Cloud      │
            │  ┌─────────────────┐  │
            │  │ PostgreSQL DB   │  │
            │  │ - profiles      │  │
            │  │ - meals         │  │
            │  │ - step_records  │  │
            │  │ - sleep_records │  │
            │  │ - weight_records│  │
            │  │ - weight_goals  │  │
            │  │ - foods         │  │
            │  └─────────────────┘  │
            └───────────────────────┘
```

### 3.2 Luồng điều hướng (Navigation Flow)

```
App khởi động
    │
    ├─ Chưa đăng nhập ──────────► auth/auth_screen
    │                                  │ Đăng ký/Đăng nhập thành công
    │                                  ▼
    ├─ Chưa có hồ sơ ──────────► onboarding/onboarding_screen
    │  (thiếu height/weight)           │ Điền xong
    │                                  ▼
    └─ Đã đăng nhập & có hồ sơ ► (tabs)/dashboard
                                       │
                              ┌────────┼────────┐
                           Tab 1    Tab 2    Tab 3
                         Dashboard Thống kê  Menu
```

### 3.3 Luồng dữ liệu bước chân

```
iPhone (Core Motion)
    │
    ▼
expo-sensors Pedometer
    │
    ├── getStepCountAsync(start, end)  → Lấy số bước từ mốc thời gian
    │
    └── watchStepCount(callback)       → Nhận bước incremental realtime
              │
              ▼
         dashboard.tsx
              │
              ├── Mỗi 30 giây: pollSteps()
              │       ├── Đọc DB (step_records hôm nay)
              │       ├── Đọc Pedometer snapshot
              │       └── Cập nhật state stepsToday
              │
              └── Khi steps tăng > 5: syncStepData()
                      └── Upsert step_records (user_id, steps, distance_km, calories_burned)
```

---

## 4. CƠ SỞ DỮ LIỆU (SUPABASE)

### 4.1 Bảng `profiles`

Lưu thông tin cá nhân và cài đặt sức khoẻ của người dùng.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid | Khoá chính, liên kết với Supabase Auth |
| `email` | text | Email đăng nhập |
| `full_name` | text | Họ và tên |
| `gender` | text | Giới tính (male/female/other) |
| `birth_date` | date | Ngày sinh |
| `height_cm` | float | Chiều cao (cm) |
| `weight_kg` | float | Cân nặng hiện tại (kg) |
| `move_goal_kcal` | int | Mục tiêu calo hoạt động hàng ngày |
| `sleep_reminder_time` | time | Giờ nhắc ngủ (HH:MM:SS hoặc null) |

### 4.2 Bảng `meals`

Ghi nhận bữa ăn hàng ngày.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigint | Khoá chính tự tăng |
| `user_id` | uuid | Khoá ngoại → profiles.id |
| `food_id` | bigint | Khoá ngoại → foods.id |
| `meal_type` | text | Loại bữa (breakfast/lunch/dinner) |
| `portion_grams` | float | Khối lượng khẩu phần (gram) |
| `calories` | float | Calo tính theo khẩu phần |
| `protein` | float | Protein (g) |
| `carbs` | float | Carbohydrate (g) |
| `fat` | float | Chất béo (g) |
| `created_at` | timestamptz | Thời điểm ghi nhận |

### 4.3 Bảng `foods`

Cơ sở dữ liệu thực phẩm (dữ liệu tĩnh, không do người dùng tạo).

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigint | Khoá chính |
| `food_name` | text | Tên thực phẩm |
| `calories_kcal` | float | Calo trên mỗi khẩu phần cơ sở |
| `energy_kj` | float | Năng lượng (kJ) |
| `protein` | float | Protein (g) |
| `carbs` | float | Carbohydrate (g) |
| `fat` | float | Chất béo (g) |
| `unit_base` | text | Khẩu phần cơ sở (vd: "100g") |
| `category_id` | int | Khoá ngoại → food_categories.id |

**8 danh mục thực phẩm:** Tinh bột, Thịt, Hải sản, Rau củ, Trái cây, Món nước, Món bánh, Đồ uống

### 4.4 Bảng `step_records`

Lưu số bước chân theo ngày.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigint | Khoá chính |
| `user_id` | uuid | Khoá ngoại → profiles.id |
| `steps` | int | Tổng số bước trong ngày |
| `distance_km` | float | Quãng đường (km) |
| `calories_burned` | float | Calo tiêu thụ |
| `created_at` | timestamptz | Ngày ghi nhận |

**Ràng buộc:** Mỗi người dùng chỉ có 1 bản ghi mỗi ngày (upsert theo `user_id` + ngày).

### 4.5 Bảng `sleep_records`

Ghi nhận giấc ngủ hàng đêm.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigint | Khoá chính |
| `user_id` | uuid | Khoá ngoại → profiles.id |
| `sleep_time` | timestamptz | Thời điểm bắt đầu ngủ |
| `wake_time` | timestamptz | Thời điểm thức dậy |
| `sleep_duration` | float | Thời gian ngủ (giờ, vd: 7.5) |
| `created_at` | timestamptz | Ngày tạo bản ghi |

### 4.6 Bảng `weight_records`

Lịch sử cân nặng theo ngày.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigint | Khoá chính |
| `user_id` | uuid | Khoá ngoại → profiles.id |
| `record_date` | date | Ngày ghi nhận (YYYY-MM-DD) |
| `weight_kg` | float | Cân nặng (kg) |

**Ràng buộc UNIQUE:** (`user_id`, `record_date`) — Mỗi ngày chỉ có 1 bản ghi, dùng upsert để cập nhật.

### 4.7 Bảng `weight_goals`

Mục tiêu cân nặng người dùng đặt ra.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | bigint | Khoá chính |
| `user_id` | uuid | Khoá ngoại → profiles.id |
| `start_weight` | float | Cân nặng bắt đầu (kg) |
| `target_weight` | float | Cân nặng mục tiêu (kg) |
| `goal_type` | text | Loại mục tiêu (lose/gain/maintain) |
| `start_date` | date | Ngày bắt đầu |
| `target_date` | date | Ngày đạt mục tiêu |
| `created_at` | timestamptz | Ngày tạo |

### 4.8 Hàm helper chuyển đổi múi giờ

Do Supabase lưu `created_at` theo UTC, cần chuyển về giờ địa phương để so sánh đúng ngày:

```ts
// Dùng getFullYear/getMonth/getDate thay vì toISOString()
// để tránh lỗi lệch ngày với múi giờ UTC+7
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

---

## 5. XÁC THỰC & ONBOARDING

### 5.1 Màn hình Xác thực (`auth/auth_screen.tsx`)

Giao diện dual-mode (2 tab): **Đăng nhập** và **Đăng ký**.

#### Đăng ký:
```ts
// Gọi Supabase Auth
const { error } = await signUp(email, password, name);
// → Tạo user trong auth.users
// → Trigger Supabase tự tạo row trong profiles
```

Validation:
- Email hợp lệ (kiểm tra định dạng)
- Mật khẩu ≥ 6 ký tự
- Xác nhận mật khẩu phải khớp

#### Đăng nhập:
```ts
const { error } = await signIn(email, password);
// → Trả về session, lưu vào AsyncStorage
```

### 5.2 AuthContext (`contexts/AuthContext.tsx`)

Context toàn cục cung cấp thông tin xác thực cho toàn bộ app:

```ts
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, name) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

**Luồng khởi động:**
1. App mount → gọi `supabase.auth.getSession()` để kiểm tra session cũ
2. Nếu có session → fetch profile từ bảng `profiles`
3. Subscribe `supabase.auth.onAuthStateChange()` để lắng nghe logout/token refresh

### 5.3 Màn hình Onboarding (`onboarding/onboarding_screen.tsx`)

Thu thập thông tin sức khoẻ ban đầu sau khi đăng ký:
- Họ và tên đầy đủ
- Giới tính (Nam/Nữ/Khác)
- Ngày sinh (YYYY-MM-DD)
- Chiều cao (cm)
- Cân nặng (kg)

```ts
await supabase.from('profiles').upsert({
  id: user.id,
  full_name, gender, birth_date,
  height_cm: parseFloat(height),
  weight_kg: parseFloat(weight),
});
await refreshProfile();
// → Redirect tự động sang Dashboard
```

---

## 6. TÍNH NĂNG THEO DÕI BƯỚC CHÂN

### 6.1 Cách hoạt động tổng quan

```
iPhone hardware (accelerometer + gyroscope)
        │
        ▼
Core Motion (iOS system framework)
        │
        ▼
expo-sensors Pedometer API
        │
    ┌───┴───────────────────┐
    │                       │
    ▼                       ▼
getStepCountAsync()    watchStepCount()
(Lấy bước đã qua)     (Realtime stream)
    │                       │
    └───────────┬───────────┘
                │
         dashboard.tsx
                │
         steps-details.tsx
```

### 6.2 Quyền truy cập cảm biến

Cấu hình trong `app.json`:
```json
{
  "ios": {
    "infoPlist": {
      "NSMotionUsageDescription": "LifeTrack cần quyền truy cập cảm biến vận động để đếm bước chân và theo dõi hoạt động hàng ngày của bạn."
    }
  },
  "android": {
    "permissions": ["android.permission.ACTIVITY_RECOGNITION"]
  }
}
```

Kiểm tra quyền trong code:
```ts
const { granted } = await Pedometer.requestPermissionsAsync();
const isAvailable = granted && (await Pedometer.isAvailableAsync());
```

### 6.3 Xử lý trong Dashboard (`dashboard.tsx`)

**Hai cơ chế song song:**

**Cơ chế 1 — Subscription realtime (chạy 1 lần khi mount):**
```ts
const setupSubscription = async () => {
  // Lấy baseline từ DB hoặc thiết bị
  const start = new Date(); start.setHours(0,0,0,0);
  const snapshot = await Pedometer.getStepCountAsync(start, new Date());
  const baseStepsForWatch = snapshot.steps;

  // Subscribe realtime
  const sub = Pedometer.watchStepCount(result => {
    if (!mounted) return;
    // Cộng baseline + bước incremental
    setStepsToday(prev => Math.max(prev, baseStepsForWatch + result.steps));
  });
  subscription.current = sub;
};
```

**Cơ chế 2 — Polling mỗi 30 giây:**
```ts
const pollSteps = async () => {
  const start = new Date(); start.setHours(0,0,0,0);
  const snapshot = await Pedometer.getStepCountAsync(start, new Date());
  const dbRecord = await supabase.from('step_records')
    .select('steps').eq('user_id', user.id)
    .gte('created_at', start.toISOString()).single();

  const dbSteps = dbRecord.data?.steps || 0;
  setStepsToday(Math.max(snapshot.steps, dbSteps));
};
```

**Đồng bộ lên DB khi có thay đổi đủ lớn:**
```ts
if (stepsToday > lastSyncedSteps + 5) {
  await syncStepData(stepsToday, distanceKm, caloriesBurned);
  setLastSyncedSteps(stepsToday);
}
```

### 6.4 Công thức tính toán

```ts
// Độ dài bước chân (cm) theo giới tính và chiều cao
const stepLengthCm = profile.gender === 'male'
  ? profile.height_cm * 0.415
  : profile.height_cm * 0.413;

// Quãng đường (km)
const distanceKm = (totalSteps * stepLengthCm) / 100000;

// Calo tiêu thụ (công thức MET đơn giản hoá)
const caloriesBurned = profile.weight_kg * distanceKm * 0.75;
```

### 6.5 Màn hình chi tiết bước chân (`steps-details.tsx`)

**Giao diện bao gồm:**
- Vòng tròn tiến trình (Activity Ring) — % calo đạt so với mục tiêu
- 7 vòng tròn ngày (Thứ 2 → Chủ Nhật) — màu sắc theo trạng thái:
  - **Vàng** — Hôm nay
  - **Xanh lá** — Đạt ≥ 10,000 bước
  - **Cam** — Có bước nhưng chưa đạt mục tiêu
  - **Xám** — Không có dữ liệu
- Biểu đồ cột 7 ngày từ DB
- Tổng bước, quãng đường, calo đã tiêu thụ
- Nút chỉnh sửa mục tiêu calo (move_goal_kcal)

**Vòng tròn Activity Ring** dùng `react-native-svg`:
```tsx
<Svg width={size} height={size}>
  <Circle  // Vòng nền
    cx={center} cy={center} r={radius}
    strokeWidth={strokeWidth} stroke="#222" fill="none"
  />
  <Circle  // Vòng tiến trình
    cx={center} cy={center} r={radius}
    strokeWidth={strokeWidth}
    stroke="#EFFF3B"
    fill="none"
    strokeDasharray={circumference}
    strokeDashoffset={circumference * (1 - progress)}
    strokeLinecap="round"
    transform={`rotate(-90 ${center} ${center})`}
  />
</Svg>
```

**Lưu dữ liệu khi rời màn hình (cleanup):**
```ts
// Dùng useRef để tránh stale closure
const latestStepsRef = useRef({ totalSteps, distanceKm, caloriesBurned });
useEffect(() => {
  latestStepsRef.current = { totalSteps, distanceKm, caloriesBurned };
});

useEffect(() => {
  return () => {
    // Đọc từ ref thay vì closure để lấy giá trị mới nhất
    const { totalSteps, distanceKm, caloriesBurned } = latestStepsRef.current;
    syncStepData(totalSteps, distanceKm, caloriesBurned);
  };
}, []);
```

---

## 7. TÍNH NĂNG THEO DÕI DINH DƯỠNG (BỮA ĂN)

### 7.1 Luồng thêm bữa ăn

```
Dashboard (chọn bữa ăn + ngày)
    │ router.push('/add-food?meal=Breakfast&date=2026-05-15')
    ▼
add-food.tsx (tìm kiếm thực phẩm)
    │ router.push('/food-detail?food={...}&meal=Breakfast&date=...')
    ▼
food-detail.tsx (nhập khẩu phần)
    │ INSERT vào bảng meals
    ▼
router.replace('/(tabs)/dashboard')
```

### 7.2 Tìm kiếm thực phẩm (`add-food.tsx`)

```ts
// Debounce 500ms để tránh query liên tục khi gõ
useEffect(() => {
  const timer = setTimeout(() => fetchFoods(), 500);
  return () => clearTimeout(timer);
}, [searchQuery, selectedCategory]);

// Query với bộ lọc tìm kiếm + danh mục
let query = supabase.from('foods').select('*').limit(20);
if (searchQuery.trim()) {
  query = query.ilike('food_name', `%${searchQuery}%`);
}
if (selectedCategory !== 0) {
  query = query.eq('category_id', selectedCategory);
}
```

### 7.3 Tính macro theo khẩu phần (`food-detail.tsx`)

Mỗi thực phẩm trong DB có giá trị dinh dưỡng tính trên khẩu phần cơ sở (vd: 100g).
Khi người dùng nhập khối lượng thực tế, tất cả chỉ số được tính theo tỉ lệ:

```ts
const ratio = quantity / (food.unit_base || 100);

const calculated = {
  calories:  (food.calories_kcal * ratio).toFixed(1),
  energy_kj: (food.energy_kj * ratio).toFixed(0),
  protein:   (food.protein * ratio).toFixed(1),
  carbs:     (food.carbs * ratio).toFixed(1),
  fat:       (food.fat * ratio).toFixed(1),
};
```

### 7.4 Lưu bữa ăn vào DB

```ts
await supabase.from('meals').insert({
  user_id:       user.id,
  food_id:       food.id,
  meal_type:     meal?.toLowerCase() || 'breakfast',
  portion_grams: quantity,
  calories:      parseFloat(calculated.calories),
  protein:       parseFloat(calculated.protein),
  carbs:         parseFloat(calculated.carbs),
  fat:           parseFloat(calculated.fat),
  created_at:    mealDate.toISOString(),  // Ngày được truyền từ dashboard
});
```

### 7.5 Hiển thị tổng dinh dưỡng trong Dashboard

```ts
// Nhóm bữa ăn theo loại
const mealsByType = meals.reduce((acc, meal) => {
  const type = meal.meal_type;
  if (!acc[type]) acc[type] = { items: [], calories: 0, protein: 0, carbs: 0, fat: 0 };
  acc[type].items.push(meal);
  acc[type].calories += meal.calories;
  // ... tương tự cho protein, carbs, fat
  return acc;
}, {});

// Tổng cả ngày
const totalCalories = meals.reduce((s, m) => s + (m.calories || 0), 0);
```

---

## 8. TÍNH NĂNG THEO DÕI GIẤC NGỦ

### 8.1 Giao diện nhập liệu (`sleep-details.tsx`)

Người dùng nhập **giờ đi ngủ** và **giờ thức dậy** bằng DateTimePicker native.

**Xử lý giấc ngủ qua đêm:**
```ts
let duration = (wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60 * 60);
if (duration < 0) duration += 24;  // Ngủ 23:00, thức 06:00 → 7 giờ
```

**Phân loại chất lượng giấc ngủ:**
```ts
const getQuality = (h: number) => {
  if (h >= 9) return { label: 'Rất tốt',    color: '#4ADE80' };
  if (h >= 8) return { label: 'Tốt',        color: '#4ADE80' };
  if (h >= 6) return { label: 'Trung bình', color: '#FACC15' };
  return        { label: 'Thiếu ngủ',       color: '#F87171' };
};
```

### 8.2 Cảnh báo thiếu ngủ

Khi người dùng lưu với thời gian ngủ < 8 giờ:
```ts
if (duration < 8) {
  setShowWarningModal(true);  // Hiện modal cảnh báo
  return;
}
// Modal cho phép: "Điều chỉnh" (đóng modal) hoặc "Vẫn lưu" (tiếp tục lưu)
```

### 8.3 Lưu lên Supabase

```ts
// Kiểm tra đã có bản ghi hôm nay chưa
const { data: existing } = await supabase
  .from('sleep_records')
  .select('id')
  .eq('user_id', user.id)
  .gte('created_at', startOfDay)
  .single();

if (existing) {
  // Cập nhật
  await supabase.from('sleep_records')
    .update({ sleep_time, wake_time, sleep_duration: duration })
    .eq('id', existing.id);
} else {
  // Tạo mới
  await supabase.from('sleep_records')
    .insert({ user_id, sleep_time, wake_time, sleep_duration: duration });
}
```

---

## 9. TÍNH NĂNG THEO DÕI CÂN NẶNG & BMI

### 9.1 Tính chỉ số BMI

```ts
const height_m = profile.height_cm / 100;
const bmi = (weight_kg / (height_m * height_m)).toFixed(1);

// Phân loại BMI theo WHO
const getBMIStatus = (bmi: number) => {
  if (bmi < 16)   return 'Thiếu cân nặng (Cấp III)';
  if (bmi < 17)   return 'Thiếu cân (Cấp II)';
  if (bmi < 18.5) return 'Thiếu cân (Cấp I)';
  if (bmi < 25)   return 'Cân nặng bình thường';
  if (bmi < 30)   return 'Thừa cân';
  if (bmi < 35)   return 'Béo phì độ I';
  if (bmi < 40)   return 'Béo phì độ II';
  return           'Béo phì độ III';
};
```

### 9.2 Ghi cân nặng theo ngày

Modal "Ghi cân nặng" cho phép chọn ngày cụ thể (hỗ trợ ghi bổ sung ngày trước đó):

```ts
const saveWeightLog = async () => {
  const dateStr = toLocalDateStr(logDate);       // Ngày được chọn
  const isToday = dateStr === toLocalDateStr(new Date());

  // Upsert: tự động cập nhật nếu ngày đó đã có bản ghi
  await supabase.from('weight_records').upsert(
    { user_id, record_date: dateStr, weight_kg: weight },
    { onConflict: 'user_id,record_date' }
  );

  // Chỉ cập nhật profile.weight_kg nếu là ngày hôm nay
  if (isToday) {
    await supabase.from('profiles').update({ weight_kg: weight }).eq('id', user.id);
  }
};
```

### 9.3 Đặt mục tiêu cân nặng (`set-weight-goal.tsx`)

```ts
// Auto-detect loại mục tiêu
const goalType = target < current ? 'lose' : target > current ? 'gain' : 'maintain';

await supabase.from('weight_goals').insert({
  user_id:        user.id,
  start_weight:   currentWeight,
  target_weight:  parseFloat(targetWeight),
  goal_type:      goalType,
  start_date:     toLocalDateStr(new Date()),
  target_date:    toLocalDateStr(targetDate),
});
```

**Tính tiến trình:**
```ts
const total    = Math.abs(goal.target_weight - goal.start_weight);
const achieved = Math.abs(currentWeight - goal.start_weight);
const progress = Math.min(Math.max(achieved / total, 0), 1);  // 0.0 – 1.0
```

---

## 10. TÍNH NĂNG UỐNG NƯỚC

### 10.1 Hệ thống lịch nhắc uống nước

8 lần nhắc mỗi ngày, lên lịch qua `expo-notifications`:

```ts
// utils/notificationHelper.ts
const WATER_SCHEDULE = [7, 9, 11.5, 13.5, 15.83, 17.5, 19.5, 23.33];

await Notifications.cancelAllScheduledNotificationsAsync();
for (const timeHour of WATER_SCHEDULE) {
  const hour   = Math.floor(timeHour);
  const minute = Math.round((timeHour - hour) * 60);
  await Notifications.scheduleNotificationAsync({
    content: { title: '💧 Uống nước nào!', body: 'Đừng quên uống nước...' },
    trigger: { type: DAILY, hour, minute },
  });
}
```

### 10.2 Popup xác nhận trong app (`dashboard.tsx`)

Khi đến giờ nhắc (theo `WATER_SCHEDULE`), hiện popup nếu người dùng đang dùng app:

```ts
// Kiểm tra mỗi phút có trùng giờ nhắc không
useEffect(() => {
  const interval = setInterval(async () => {
    const waterEnabled = await AsyncStorage.getItem('water_reminders_enabled');
    if (waterEnabled === 'false') return;  // Tắt nhắc → bỏ qua

    const nowH = now.getHours() + now.getMinutes() / 60;
    const shouldShow = WATER_SCHEDULE.some(t => Math.abs(nowH - t) < 1/60);
    if (shouldShow && confirmedGlasses < 8) setShowWaterReminder(true);
  }, 60000);
  return () => clearInterval(interval);
}, [now, confirmedGlasses]);
```

### 10.3 Xác nhận và đếm ly nước

```ts
// Khi người dùng nhấn "Đã uống rồi 👍"
const handleWaterConfirm = async () => {
  const newCount = Math.min(confirmedGlasses + 1, 8);
  setConfirmedGlasses(newCount);
  setShowWaterReminder(false);

  // Lưu vào AsyncStorage (reset mỗi ngày mới)
  const today = toLocalDateStr(new Date());
  await AsyncStorage.setItem('water_confirmed',
    JSON.stringify({ date: today, count: newCount })
  );

  // Đủ 8 ly → hiện celebration + haptic
  if (newCount === 8) {
    setShowCelebration(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setShowCelebration(false), 5000);
  }
};
```

### 10.4 Khôi phục trạng thái khi mở app

```ts
useEffect(() => {
  const today = toLocalDateStr(new Date());
  AsyncStorage.getItem('water_confirmed').then(raw => {
    if (raw) {
      const { date, count } = JSON.parse(raw);
      if (date === today) setConfirmedGlasses(count);  // Cùng ngày → khôi phục
      // Khác ngày → tự reset về 0
    }
  });
}, []);
```

---

## 11. MÀN HÌNH DASHBOARD (TRANG CHỦ)

### 11.1 Cấu trúc giao diện

```
┌─────────────────────────────────┐
│  [Avatar] Chào buổi sáng, Quân  │  ← Lời chào theo giờ
│  [🔔] [📅]                      │  ← Nút điều hướng
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │  Hôm nay: 1,234 kcal   │    │  ← Tổng calo + vòng tiến trình
│  │  ████░░░░░░░░           │    │
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  [Bước: 8,432] [Nước: 3/8 ly]  │  ← Grid 2x2
│  [BMI: 22.5]   [Ngủ: 7h30m]   │
├─────────────────────────────────┤
│  CN T2 T3 T4 T5 T6 T7          │  ← Lịch 7 ngày
├─────────────────────────────────┤
│  Carb 120g  Đạm 89g  Béo 45g   │  ← Tổng macro
├─────────────────────────────────┤
│  🌅 Bữa sáng  450 kcal  [+]    │  ← Bữa ăn theo loại
│    - Cơm trắng (200g)    [🗑️]  │
│  ☀️ Bữa trưa   720 kcal  [+]   │
│  🌙 Bữa tối    ...       [+]   │
└─────────────────────────────────┘
```

### 11.2 Lời chào động theo giờ

```ts
const getGreeting = () => {
  const hour = now.getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return             'Chào buổi tối';
};
```

### 11.3 Fetch dữ liệu khi focus tab

Dùng `useFocusEffect` để tải lại dữ liệu mỗi khi tab Dashboard được focus:

```ts
useFocusEffect(useCallback(() => {
  fetchMeals(selectedDate);
  fetchSleep();
}, [selectedDate]));
```

---

## 12. MÀN HÌNH THỐNG KÊ

### 12.1 Tổng quan (`explore.tsx`)

Hiển thị dữ liệu lịch sử theo kỳ **7 ngày** hoặc **30 ngày** (người dùng toggle).

**Dữ liệu được tải song song:**
```ts
const [stepRes, mealRes, sleepRes, weightRes] = await Promise.all([
  supabase.from('step_records').select('steps, created_at')
    .eq('user_id', user.id).gte('created_at', startDate.toISOString()),
  supabase.from('meals').select('calories, created_at')
    .eq('user_id', user.id).gte('created_at', startDate.toISOString()),
  supabase.from('sleep_records').select('sleep_duration, created_at')
    .eq('user_id', user.id).gte('created_at', startDate.toISOString()),
  supabase.from('weight_records').select('record_date, weight_kg')
    .eq('user_id', user.id).gte('record_date', startDateStr),
]);
```

### 12.2 Biểu đồ cột (Bar Chart)

Biểu đồ tự xây dựng bằng View/Flex của React Native (không dùng thư viện chart ngoài):

```tsx
<View className="flex-row items-end justify-between" style={{ height: 96 }}>
  {values.map((val, idx) => {
    const barH = val > 0 ? Math.max(8, (val / maxVal) * 74) : 5;
    return (
      <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
        <View style={{
          height: barH,
          backgroundColor: colorFn(val),
          borderRadius: 4,
          width: barWidth,        // 18px cho 7 ngày, 8px cho 30 ngày
          opacity: val > 0 ? 1 : 0.2,
        }} />
        <Text style={{ fontSize: 8, marginTop: 5 }}>{labels[idx]}</Text>
      </View>
    );
  })}
</View>
```

### 12.3 Biểu đồ cân nặng với tương tác tap

Mỗi cột cân nặng có thể tap để xem giá trị:

```tsx
const activeIdx = selectedWeightIdx ?? weightPoints.length - 1;

<TouchableOpacity onPress={() => setSelectedWeightIdx(idx)}>
  <Text style={{ opacity: isActive ? 1 : 0 }}>{pt.weight}kg</Text>
  <View style={{
    backgroundColor: isActive ? '#60A5FA' : '#2563EB',
    opacity: isActive ? 1 : 0.6,
  }} />
  <Text style={{ color: isActive ? '#EFFF3B' : '#3a3a3a' }}>{pt.label}</Text>
</TouchableOpacity>
```

### 12.4 Màu sắc biểu đồ theo ngưỡng

| Chỉ số | Xanh lá | Cam | Đỏ |
|---|---|---|---|
| Bước chân | ≥ mục tiêu (10,000) | > 0 | — |
| Giấc ngủ | ≥ 8 giờ | 6–8 giờ | < 6 giờ |
| Calo | > 0 | — | — |
| BMI | 18.5–25 | 25–30 | ≥ 30 |

---

## 13. THÔNG BÁO & NHẮC NHỞ

### 13.1 Kiến trúc thông báo

```
app/_layout.tsx
  │
  ├── Khởi động app → registerForPushNotificationsAsync()
  │       └── Tạo Android notification channel
  │
  ├── scheduleWaterReminders()
  │       └── 8 thông báo daily triggers
  │
  └── Khi profile.sleep_reminder_time thay đổi
          └── scheduleSleepReminder(time)
```

### 13.2 Nhắc ngủ

```ts
// utils/notificationHelper.ts
export const scheduleSleepReminder = async (timeStr: string | null) => {
  // Xoá reminder cũ
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing  = scheduled.find(n => n.content.data?.type === 'sleep_reminder');
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing.identifier);

  if (!timeStr) return;  // Tắt nhắc → chỉ xoá

  const [h, m] = timeStr.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '😴 Đến giờ ngủ rồi!',
      body:  'Giấc ngủ đủ giúp cơ thể phục hồi và tăng cường sức khoẻ.',
      data:  { type: 'sleep_reminder' },
    },
    trigger: { type: DAILY, hour: h, minute: m },
  });
};
```

### 13.3 Màn hình cài đặt thông báo (`notifications.tsx`)

**Sleep reminder:**
- Toggle bật/tắt → gọi `saveSleepReminder(time, enabled)`
- Nhấn vào giờ → mở `DateTimePicker` (iOS: spinner trong modal, Android: native picker)
- Lưu vào `profiles.sleep_reminder_time` + gọi `scheduleSleepReminder()`

**Water reminder:**
- Toggle bật/tắt → lưu `'water_reminders_enabled'` vào AsyncStorage
- Dashboard đọc giá trị này trước khi hiện popup

---

## 14. CÀI ĐẶT & HỒ SƠ NGƯỜI DÙNG

### 14.1 Màn hình cài đặt (`menu.tsx`)

Cấu trúc:
```
Cài đặt
  └─ [Hồ sơ cá nhân] ──► /profile
  └─ [Nhắc nhở & Thông báo] ──► /notifications

Thông tin
  └─ [Chính sách bảo mật] ──► Modal inline

[Đăng xuất] ──► Confirm modal ──► signOut()
```

### 14.2 Chỉnh sửa hồ sơ (`profile.tsx`)

```ts
await supabase.from('profiles').update({
  full_name, gender, birth_date,
  height_cm: parseFloat(height),
  weight_kg: parseFloat(weight),
}).eq('id', user.id);

await refreshProfile();  // Cập nhật context → re-render toàn app
```

---

## 15. QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)

### 15.1 Không dùng Redux/MobX

App sử dụng **React Context API + useState/useEffect** thuần:

| Loại state | Nơi lưu | Ví dụ |
|---|---|---|
| Auth & Profile | `AuthContext` (Context API) | user, session, profile |
| Dữ liệu màn hình | `useState` cục bộ | meals, steps, sleep |
| Persist qua session | `AsyncStorage` | water count, reminder toggle |
| Persist qua thiết bị | `Supabase DB` | Tất cả dữ liệu sức khoẻ |

### 15.2 useFocusEffect — Tải lại khi tab được focus

```ts
// Chạy lại mỗi khi người dùng navigate vào màn hình
useFocusEffect(useCallback(() => {
  fetchStats();
}, [fetchStats]));
```

### 15.3 useCallback — Tránh tạo lại function vô ích

```ts
// fetchStats chỉ tạo lại khi user, period hoặc height_cm thay đổi
const fetchStats = useCallback(async () => {
  // ...
}, [user, period, profile?.height_cm]);
```

---

## 16. CẤU TRÚC THƯ MỤC & FILE

```
DoAnTotNghiep_64131905/
├── app/
│   ├── _layout.tsx                    # Root layout, Auth provider, notification init
│   ├── index.tsx                      # Redirect → splash
│   ├── splash_screen.tsx              # Màn hình splash 2 giây
│   ├── modal.tsx                      # Modal placeholder
│   │
│   ├── auth/
│   │   └── auth_screen.tsx            # Đăng nhập / Đăng ký
│   │
│   ├── onboarding/
│   │   └── onboarding_screen.tsx      # Thu thập hồ sơ sức khoẻ
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx                # Bottom tab navigator (3 tab)
│   │   ├── dashboard.tsx              # Trang chủ — tổng hợp các chỉ số
│   │   ├── explore.tsx                # Thống kê — biểu đồ 7/30 ngày
│   │   └── menu.tsx                   # Cài đặt — profile, notifications, logout
│   │
│   ├── profile.tsx                    # Chỉnh sửa hồ sơ cá nhân
│   ├── notifications.tsx              # Cài đặt thông báo (sleep + water toggle)
│   │
│   ├── steps-details.tsx              # Chi tiết bước chân + ring + chart
│   ├── sleep-details.tsx              # Ghi nhận giấc ngủ + lịch sử
│   ├── weight-details.tsx             # Cân nặng + BMI + mục tiêu
│   ├── set-weight-goal.tsx            # Đặt mục tiêu cân nặng
│   │
│   ├── add-food.tsx                   # Tìm kiếm thực phẩm
│   └── food-detail.tsx                # Chi tiết dinh dưỡng + lưu bữa ăn
│
├── contexts/
│   └── AuthContext.tsx                # Global auth & profile state
│
├── utils/
│   └── notificationHelper.ts         # Lên lịch thông báo (water + sleep)
│
├── constants/
│   ├── categories.ts                  # 8 danh mục thực phẩm
│   └── theme.ts                       # Màu sắc và font chữ
│
├── supabase/
│   └── supabaseClient.js              # Khởi tạo Supabase client
│
├── app.json                           # Cấu hình Expo (permissions, bundle ID...)
├── package.json                       # Dependencies
├── tailwind.config.js                 # Cấu hình NativeWind + custom colors
└── tsconfig.json                      # TypeScript config
```

---

## PHỤ LỤC — TÓM TẮT CÔNG NGHỆ

| Công nghệ | Phiên bản | Mục đích sử dụng |
|---|---|---|
| React Native | 0.81.5 | Nền tảng UI mobile cross-platform |
| Expo SDK | 54.0.33 | Công cụ phát triển, đóng gói, APIs thiết bị |
| Expo Router | 4.x | File-based navigation |
| TypeScript | 5.x | Kiểu dữ liệu tĩnh cho JavaScript |
| NativeWind | 4.2.2 | Tailwind CSS cho React Native |
| Supabase JS | 2.98.0 | PostgreSQL client + Auth |
| expo-sensors | 55.0.8 | Pedometer — đếm bước chân (Core Motion / Activity Recognition) |
| expo-notifications | 0.32.16 | Lên lịch thông báo local |
| expo-haptics | 15.0.8 | Phản hồi rung |
| @react-native-community/datetimepicker | 8.6.0 | Chọn ngày/giờ native |
| @react-native-async-storage/async-storage | 2.2.0 | Lưu trữ cục bộ |
| @expo/vector-icons | 15.0.3 | Icon (MaterialCommunityIcons) |
| react-native-svg | 15.12.1 | Vẽ Activity Ring |
| react-native-reanimated | 4.1.1 | Animation |

---

*Báo cáo được tạo tự động từ mã nguồn — LifeTrack v1.0.0*
