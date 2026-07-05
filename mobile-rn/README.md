# SIPTU ULTRA Mobile

Aplikasi mobile SIPTU ULTRA (Sistem Informasi Pelayanan Tata Usaha Ultra) dibangun dengan React Native, Expo, dan NativeWind.

## 🚀 Tech Stack

- **Framework**: React Native 0.81 + Expo SDK 54
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: React Navigation v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: @expo/vector-icons (Ionicons)

## 📁 Project Structure

```
mobile/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── MenuCard.tsx
│   │   └── StatCard.tsx
│   ├── screens/          # Screen components
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   └── menu/
│   │       ├── AssetLoanScreen.tsx
│   │       └── ItHelpdeskScreen.tsx
│   ├── navigation/       # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── services/         # API services
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   └── dashboardService.ts
│   ├── store/            # Zustand stores
│   │   └── authStore.ts
│   ├── types/            # TypeScript types
│   │   ├── index.ts
│   │   └── nativewind.d.ts
│   ├── styles/           # Global styles
│   │   └── global.css
│   └── hooks/            # Custom hooks
├── assets/               # Images, fonts, etc.
├── App.tsx              # Entry point
├── package.json
├── tailwind.config.js   # Tailwind CSS config
├── babel.config.js      # Babel config with NativeWind
└── tsconfig.json        # TypeScript config
```

## 🛠️ Installation

```bash
# Navigate to mobile directory
cd mobile-rn

# Install dependencies
npm install

# Start the development server
npm start
```

## 📱 Running the App

```bash
# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios

# Run on web
npm run web

# Start Expo development server
npm start
```

## 🔌 API Configuration

Base URL API diatur di `src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://siptu.bpompalopo.com/core_api/api';
```

## 🎨 Color Palette

- **Primary**: `#2563eb` (Blue 600)
- **Secondary**: `#64748b` (Slate 500)
- **Success**: `#059669` (Emerald 600)
- **Warning**: `#d97706` (Amber 600)
- **Danger**: `#dc2626` (Red 600)

## 📝 Features

### Implemented
- ✅ Login Screen dengan validasi
- ✅ Dashboard dengan statistik
- ✅ Menu layanan (Peminjaman Aset, IT Helpdesk)
- ✅ Profile Screen
- ✅ Bottom Navigation
- ✅ NativeWind styling

### Coming Soon
- 🔄 Integrasi API lengkap
- 🔄 Push Notifications
- 🔄 Offline mode
- 🔄 Biometric authentication
- 🔄 Dark mode

## 🔧 Troubleshooting

### NativeWind classes not working
Pastikan `babel.config.js` sudah terkonfigurasi dengan plugin NativeWind:

```javascript
plugins: ['nativewind/babel', 'react-native-reanimated/plugin']
```

### Metro bundler error
Reset cache dengan:

```bash
npx expo start --clear
```

## 📄 License

Copyright © 2025 BPOM Palopo. All rights reserved.
