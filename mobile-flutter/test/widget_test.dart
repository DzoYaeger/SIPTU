import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:siptu_mobile/main.dart';

void main() {
  testWidgets('SiptuMobileApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SiptuMobileApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
