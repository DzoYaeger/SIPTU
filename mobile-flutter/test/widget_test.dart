// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

import 'package:siptu_ultra_mobile/main.dart';
import 'package:siptu_ultra_mobile/features/auth/presentation/auth_screen.dart';

void main() {
  testWidgets('login renders', (WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(home: AuthScreen(onAuthenticated: _noop)));
    expect(find.text('Selamat datang kembali'), findsOneWidget);
    expect(find.text('Masuk ke aplikasi'), findsOneWidget);
  });
}

void _noop() {}
