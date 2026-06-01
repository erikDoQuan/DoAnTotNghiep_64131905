# Chương 2. CƠ SỞ LÝ THUYẾT

## 2.1 REACT NATIVE

### 2.1.1 Khái niệm React Native

React Native là một framework mã nguồn mở do Meta (Facebook) phát triển và ra mắt
vào năm 2015, cho phép xây dựng ứng dụng di động đa nền tảng bằng ngôn ngữ
JavaScript hoặc TypeScript. Điểm đặc biệt của React Native là lập trình viên chỉ cần
viết một codebase duy nhất nhưng ứng dụng có thể chạy được trên cả hai hệ điều hành
iOS và Android, đồng thời vẫn sử dụng các thành phần giao diện native thật sự thay vì
WebView như các giải pháp Hybrid thông thường.

> [Hình 2.1. Logo React Native]

### 2.1.2 Kiến trúc React Native

#### 2.1.2.1 Tổng quan kiến trúc

> [Hình 2.2. Kiến trúc React Native New Architecture]
> *(Nguồn: [link nguồn])*

Hình 2.2 mô tả kiến trúc mới của React Native (New Architecture), được bật mặc định
trong Expo SDK 54. Các thành phần chính trong kiến trúc này bao gồm:

- **JS Bundle:** Là nơi chứa toàn bộ mã JavaScript/TypeScript của ứng dụng sau khi
  được đóng gói. Đây là nơi xử lý toàn bộ logic nghiệp vụ như tính toán, gọi API,
  quản lý dữ liệu,…

- **JSI (JavaScript Interface):** Là cầu nối trực tiếp giữa JavaScript và native, thay thế
  cho cơ chế Bridge bất đồng bộ của kiến trúc cũ. JSI giúp JavaScript giao tiếp với
  native nhanh hơn, giảm độ trễ đáng kể so với trước.

- **Renderer và Native Modules:** Nhận lệnh từ JavaScript và chuyển thành các lệnh
  giao diện hoặc chức năng native tương ứng trên thiết bị.

- **Yoga:** Là công cụ tính toán bố cục giao diện (layout engine) chạy trên Shadow
  thread. Yoga tính toán vị trí và kích thước của từng phần tử theo quy tắc Flexbox
  trước khi hiển thị lên màn hình.

- **Native UI / Native Modules:** Là các thành phần giao diện và tính năng thật sự của
  hệ điều hành iOS hoặc Android, được hiển thị sau khi Yoga tính toán xong layout.

- **Codegen:** Là công cụ tự động sinh ra các interface từ định nghĩa TypeScript, giúp
  đảm bảo kiểu dữ liệu chính xác giữa JavaScript và native ngay từ lúc build ứng dụng.

#### 2.1.2.2 Components trong React Native

React Native xây dựng giao diện thông qua các Component — những khối giao diện độc
lập và có thể tái sử dụng. Mỗi Component nhận dữ liệu đầu vào (Props) và quản lý
trạng thái nội bộ (State), khi State thay đổi giao diện sẽ tự động cập nhật lại. Các
Component cơ bản gồm có: `View`, `Text`, `TextInput`, `TouchableOpacity`,
`ScrollView`, `FlatList`,…

#### 2.1.2.3 State và Props

- **Props (Properties):** Là dữ liệu được truyền từ Component cha xuống Component con,
  chỉ đọc và không thể thay đổi bên trong Component nhận.
- **State:** Là dữ liệu nội bộ của Component, có thể thay đổi và khi thay đổi sẽ kích hoạt
  việc render lại giao diện.

---

## 2.2 TYPESCRIPT

### 2.2.1 Khái niệm TypeScript

TypeScript là một ngôn ngữ lập trình mã nguồn mở do Microsoft phát triển, là phiên
bản mở rộng (superset) của JavaScript với hỗ trợ kiểu dữ liệu tĩnh (static typing).
TypeScript được biên dịch sang JavaScript trước khi chạy, giúp phát hiện lỗi ngay trong
quá trình viết code thay vì chỉ phát hiện khi runtime.

> [Hình 2.3. Mối quan hệ giữa TypeScript và JavaScript]

### 2.2.2 Các tính năng chính của TypeScript

- **Static Typing:** Khai báo kiểu dữ liệu rõ ràng cho biến, tham số và giá trị trả về,
  giúp phát hiện lỗi sớm và cải thiện khả năng đọc code.
- **Interface & Type:** Cho phép định nghĩa cấu trúc dữ liệu tường minh, đặc biệt hữu
  ích khi làm việc với dữ liệu từ API.
- **Generics:** Cho phép viết code linh hoạt, tái sử dụng được với nhiều kiểu dữ liệu khác nhau.
- **Tích hợp tốt với React Native:** Toàn bộ ứng dụng LifeTrack được viết bằng
  TypeScript, đảm bảo kiểu dữ liệu nhất quán từ lớp giao diện đến lớp xử lý dữ liệu.

---

## 2.3 EXPO FRAMEWORK

### 2.3.1 Tổng quan về Expo

Expo là một nền tảng và bộ công cụ mã nguồn mở được xây dựng trên nền tảng React
Native, giúp đơn giản hóa quá trình khởi tạo, phát triển và triển khai ứng dụng di động.
Expo cung cấp sẵn hàng chục API tích hợp cho phép truy cập các tính năng phần cứng
của thiết bị mà không cần cấu hình native phức tạp.

> [Hình 2.4. Kiến trúc tổng quan của Expo]

### 2.3.2 Expo Router

Expo Router là thư viện điều hướng màn hình theo cấu trúc file (file-based routing),
tương tự Next.js cho web. Mỗi file trong thư mục `app/` tự động trở thành một màn hình
có thể điều hướng đến. Cách tiếp cận này giúp cấu trúc ứng dụng rõ ràng, dễ bảo trì và
hỗ trợ deep linking tự động.

### 2.3.3 expo-sensors (Pedometer)

`expo-sensors` cung cấp API truy cập các cảm biến phần cứng của điện thoại, trong đó
quan trọng nhất với LifeTrack là Pedometer — cảm biến bộ đếm bước chân. API này
cho phép đăng ký lắng nghe bước chân theo thời gian thực (`watchStepCount`) hoặc
truy vấn tổng số bước trong một khoảng thời gian (`getStepCountAsync`).

### 2.3.4 expo-notifications

`expo-notifications` cho phép ứng dụng lên lịch và gửi thông báo cục bộ (local
notifications) đến người dùng. Trong LifeTrack, thư viện này được sử dụng để nhắc
nhở uống nước theo giờ cố định trong ngày và nhắc đi ngủ theo giờ người dùng cài đặt.

---

## 2.4 SUPABASE

### 2.4.1 Khái niệm Supabase

Supabase là nền tảng Backend as a Service (BaaS) mã nguồn mở, thường được gọi là
"Firebase mã nguồn mở". Supabase cung cấp đầy đủ hạ tầng backend gồm cơ sở dữ
liệu, xác thực người dùng, lưu trữ file và API tự động, giúp lập trình viên frontend có
thể xây dựng ứng dụng hoàn chỉnh mà không cần tự quản lý server.

> [Hình 2.5. Tổng quan kiến trúc Supabase]

### 2.4.2 Authentication (Xác thực người dùng)

Supabase Authentication cung cấp hệ thống xác thực người dùng sẵn có với nhiều
phương thức như email/password, OAuth (Google, Apple,...) và Magic Link. Trong
LifeTrack, xác thực được thực hiện qua email và mật khẩu, kết hợp với JWT
(JSON Web Token) để duy trì phiên đăng nhập an toàn.

### 2.4.3 Database và Row Level Security

Supabase Database cho phép tạo và quản lý các bảng dữ liệu thông qua giao diện trực
quan hoặc SQL. Tính năng **Row Level Security (RLS)** là cơ chế bảo mật ở cấp độ
hàng dữ liệu, đảm bảo mỗi người dùng chỉ có thể đọc và ghi dữ liệu của chính mình.
LifeTrack sử dụng 9 bảng dữ liệu: `profiles`, `meals`, `foods`, `food_categories`,
`step_records`, `sleep_records`, `weight_records`, `weight_goals`, `water_records`.

### 2.4.4 REST API

Supabase tự động tạo REST API đầy đủ từ cấu trúc bảng dữ liệu. Thư viện
`@supabase/supabase-js` cho phép truy vấn, thêm, sửa, xóa dữ liệu trực tiếp từ
ứng dụng React Native mà không cần xây dựng API riêng.

---

## 2.5 NATIVEWIND

### 2.5.1 Khái niệm NativeWind

NativeWind là thư viện cho phép sử dụng cú pháp Tailwind CSS trong React Native.
Tailwind CSS là một framework CSS theo hướng Utility-first, tức là thay vì viết các
class CSS tùy chỉnh, lập trình viên sử dụng các class tiện ích có sẵn như `flex`,
`bg-white`, `rounded-2xl`, `px-4`, `text-lg`,… để tạo giao diện nhanh chóng.

> [Hình 2.6. So sánh cách viết giao diện với StyleSheet và NativeWind]

### 2.5.2 Lợi ích của NativeWind trong dự án

- **Tốc độ phát triển nhanh:** Không cần viết StyleSheet riêng, giao diện được định nghĩa
  trực tiếp trên thẻ Component.
- **Nhất quán thiết kế:** Hệ thống spacing, màu sắc, typography đồng bộ toàn ứng dụng.
- **Dễ bảo trì:** Thay đổi giao diện ngay trên JSX mà không cần tìm sang file style riêng.

---

## 2.6 PEDOMETER (CẢM BIẾN BỘ ĐẾM BƯỚC CHÂN)

### 2.6.1 Khái niệm Pedometer

Pedometer là cảm biến phần cứng được tích hợp trong hầu hết các điện thoại thông
minh hiện đại, có khả năng đếm số bước đi bộ của người dùng dựa trên gia tốc kế
(Accelerometer) và con quay hồi chuyển (Gyroscope). Trên iOS, tính năng này được
cung cấp bởi Core Motion framework; trên Android là Activity Recognition API.

> [Hình 2.7. Nguyên lý hoạt động của cảm biến Pedometer]

### 2.6.2 Ứng dụng Pedometer trong LifeTrack

Trong LifeTrack, API `Pedometer` từ `expo-sensors` được sử dụng để:
- Đếm số bước chân theo thời gian thực trong ngày.
- Tính toán quãng đường di chuyển dựa trên chiều cao và giới tính người dùng.
- Ước tính lượng calo tiêu thụ từ số bước chân.
- Đồng bộ dữ liệu bước chân lên Supabase mỗi 30 giây để lưu lịch sử.

---

## 2.7 PUSH NOTIFICATION (THÔNG BÁO ĐẨY)

### 2.7.1 Khái niệm Push Notification

Push Notification là cơ chế cho phép ứng dụng gửi thông báo đến người dùng ngay cả
khi ứng dụng đang chạy nền hoặc đã đóng hoàn toàn. Có hai loại notification chính:
- **Remote Notification:** Gửi từ server đến thiết bị qua dịch vụ APNs (iOS) hoặc FCM (Android).
- **Local Notification:** Được lên lịch và gửi trực tiếp từ thiết bị, không cần server.

> [Hình 2.8. Cơ chế hoạt động của Local Notification]

### 2.7.2 Ứng dụng Notification trong LifeTrack

LifeTrack sử dụng **Local Notification** thông qua `expo-notifications` để:
- Nhắc nhở uống nước theo lịch cố định từ 7:00 đến 21:30, phân bổ đều theo số
  lần người dùng cài đặt (4–12 lần/ngày).
- Nhắc nhở đi ngủ đúng giờ mỗi ngày theo thời gian người dùng thiết lập.
- Hiển thị thông báo ngay trên màn hình khi ứng dụng đang mở (foreground notification).
