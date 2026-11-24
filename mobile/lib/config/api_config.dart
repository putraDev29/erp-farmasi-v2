import 'package:flutter/foundation.dart';

class ApiConfig {
  // Default development API URL
  // On Android Emulator: use 10.0.2.2 instead of localhost
  // On iOS Simulator / Web: use localhost
  // On Real Device: change to your machine's local IP address (e.g., 192.168.1.100)
  static String _baseUrl = kIsWeb
      ? 'http://${Uri.base.host.isNotEmpty ? Uri.base.host : "192.168.100.93"}:8080/api/v1'
      : 'http://192.168.100.93:8080/api/v1';

  static String get baseUrl => _baseUrl;

  static void setBaseUrl(String url) {
    if (url.endsWith('/')) {
      _baseUrl = url.substring(0, url.length - 1);
    } else {
      _baseUrl = url;
    }
  }

  // Auth
  static String get login => '$_baseUrl/auth/login';
  static String get registerCustomer => '$_baseUrl/auth/register-customer';
  static String get me => '$_baseUrl/auth/me';

  // Products
  static String get products => '$_baseUrl/products';
  static String get categories => '$_baseUrl/categories';

  // Customers (Registrasi Usaha & Kepatuhan Legalitas)
  static String get customers => '$_baseUrl/customers';

  // Sales Orders & Marketplace
  static String get salesOrders => '$_baseUrl/sales/orders';
  static String get sales => '$_baseUrl/sales';

  // Warehouse (Pembelian & Penerimaan Barang)
  static String get purchases => '$_baseUrl/purchases';
  static String get purchaseOrders => '$_baseUrl/purchases/orders';

  // Documents Upload & Management (CDOB Compliance)
  static String get documents => '$_baseUrl/documents';
  static String get documentUpload => '$_baseUrl/documents/upload';
}
