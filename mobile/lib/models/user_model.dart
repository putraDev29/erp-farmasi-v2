import 'customer_model.dart';

class UserModel {
  final String id;
  final String username;
  final String fullName;
  final String? email;
  final String? phone;
  final List<String> roles;
  final String companyId;
  final String branchId;
  final CustomerModel? customer;

  UserModel({
    required this.id,
    required this.username,
    required this.fullName,
    this.email,
    this.phone,
    required this.roles,
    required this.companyId,
    required this.branchId,
    this.customer,
  });

  bool get isGudang => roles.any((r) =>
      r.toUpperCase().contains('GUDANG') || username.toLowerCase() == 'gudang');

  bool get isPelanggan => roles.any((r) =>
      r.toUpperCase().contains('PELANGGAN') ||
      r.toUpperCase().contains('CUSTOMER'));

  bool get isAdmin => roles.any((r) =>
      r.toUpperCase().contains('ADMIN') ||
      r.toUpperCase().contains('APOTEKER') ||
      r.toUpperCase().contains('SUPERADMIN'));

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      fullName: json['full_name'] ?? json['username'] ?? '',
      email: json['email'],
      phone: json['phone'],
      roles: (json['roles'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      companyId: json['company_id'] ?? '',
      branchId: json['branch_id'] ?? '',
      customer: json['customer'] != null
          ? CustomerModel.fromJson(json['customer'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'full_name': fullName,
      'email': email,
      'phone': phone,
      'roles': roles,
      'company_id': companyId,
      'branch_id': branchId,
      'customer': customer?.toJson(),
    };
  }
}
