# SIPTU ULTRA Mobile release checklist

## Implemented foundation

- Flutter Android/iOS project and Material 3 Fluent Enterprise design system
- Auth, MFA/OTP, secure token storage, biometric session gate, and logout
- Layanan Mandiri UI: IT Helpdesk, Izin Keluar, Peminjaman Arsip
- Riwayat pengajuan, notifikasi, and SIMKEU mobile dashboard/list
- Draft store, multipart upload adapter, push notification adapter, and deep-link parser

## Before production release

- Configure production API base URL per flavor (development/staging/production)
- Connect `NotificationService` to Firebase/APNs and register the device token API
- Replace the in-memory `DraftStore` with Hive/Isar for durable offline drafts
- Verify all endpoint payloads with staging credentials and backend rate limits
- Configure Android signing, iOS provisioning, privacy strings, and store metadata
- Run unit, widget, integration, accessibility, and performance tests on target devices
- Complete UAT with representatives from IT, finance, and administration teams
