# Project Standards & Concise Reporting

## Technical Standards
- **Mobile**: React Native + NativeWind + Ionicons + Reanimated v3.
- **Data**: `apiService` with `pageSize: 1000` for assets. Auth via `useAuthStore`.
- **UI**: Use `ConfirmModal` and `SuccessModal` from `src/components`.
- **Signature**: `react-native-signature-canvas` with explicit height for web.

## Token Efficiency & Communication Rule
- **Hemat Token**: Hindari membaca file besar secara utuh. Gunakan `grep` atau baca range baris yang relevan saja.
- **Concise Reporting**: Jangan menjelaskan proses secara panjang lebar. Langsung ke inti perbaikan.
- **Daftar Upload**: Setelah modifikasi, wajib list file yang diubah beserta **full file path**-nya untuk diupload.

## Workflow
1. Plan (Sangat singkat).
2. Execute (Edit file).
3. Verify.

