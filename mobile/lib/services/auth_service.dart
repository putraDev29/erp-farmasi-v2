import '../config/api_config.dart';
import '../models/user_model.dart';
import 'api_client.dart';

class AuthService {
  static Future<UserModel> login(String username, String password) async {
    final res = await ApiClient.post(
      ApiConfig.login,
      body: {
        'username': username,
        'password': password,
      },
    );

    final data = res['data'];
    final token = data['token'];
    await ApiClient.saveToken(token);

    return UserModel.fromJson(data['user']);
  }

  static Future<UserModel> registerCustomer({
    required String username,
    required String password,
    required String fullName,
    String? email,
    required String phone,
    required String businessName,
    String pharmacyType = 'APOTEK',
    String? address,
    String? city,
    String? province,
  }) async {
    final res = await ApiClient.post(
      ApiConfig.registerCustomer,
      body: {
        'username': username,
        'password': password,
        'full_name': fullName,
        'email': email,
        'phone': phone,
        'business_name': businessName,
        'pharmacy_type': pharmacyType,
        'address': address,
        'city': city,
        'province': province,
      },
    );

    final data = res['data'];
    final token = data['token'];
    await ApiClient.saveToken(token);

    return UserModel.fromJson(data['user']);
  }

  static Future<UserModel?> getCurrentUser() async {
    final token = await ApiClient.getToken();
    if (token == null) return null;

    try {
      final res = await ApiClient.get(ApiConfig.me);
      final data = res['data'];
      return UserModel.fromJson(data);
    } catch (_) {
      await ApiClient.clearToken();
      return null;
    }
  }

  static Future<void> logout() async {
    await ApiClient.clearToken();
  }
}
