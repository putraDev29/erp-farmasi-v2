import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../models/customer_model.dart';
import '../services/auth_service.dart';

enum AuthStatus { uninitialized, authenticated, unauthenticated, loading }

class AuthProvider with ChangeNotifier {
  AuthStatus _status = AuthStatus.uninitialized;
  UserModel? _user;
  String? _errorMessage;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isGudang => _user?.isGudang ?? false;
  bool get isPelanggan => _user?.isPelanggan ?? false;
  CustomerModel? get customer => _user?.customer;

  Future<void> init() async {
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final user = await AuthService.getCurrentUser();
      if (user != null) {
        _user = user;
        _status = AuthStatus.authenticated;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (_) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await AuthService.login(username, password);
      _user = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> registerCustomer({
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
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await AuthService.registerCustomer(
        username: username,
        password: password,
        fullName: fullName,
        email: email,
        phone: phone,
        businessName: businessName,
        pharmacyType: pharmacyType,
        address: address,
        city: city,
        province: province,
      );
      _user = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> refreshProfile() async {
    try {
      final user = await AuthService.getCurrentUser();
      if (user != null) {
        _user = user;
        notifyListeners();
      }
    } catch (_) {}
  }

  void updateCustomerProfile(CustomerModel updatedCustomer) {
    if (_user != null) {
      _user = UserModel(
        id: _user!.id,
        username: _user!.username,
        fullName: _user!.fullName,
        email: _user!.email,
        phone: _user!.phone,
        roles: _user!.roles,
        companyId: _user!.companyId,
        branchId: _user!.branchId,
        customer: updatedCustomer,
      );
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
