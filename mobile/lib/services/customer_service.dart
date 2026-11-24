import '../config/api_config.dart';
import '../models/customer_model.dart';
import 'api_client.dart';

class CustomerService {
  static Future<CustomerModel> getCustomerDetail(String customerId) async {
    final res = await ApiClient.get('${ApiConfig.customers}/$customerId');
    return CustomerModel.fromJson(res['data']);
  }

  static Future<CustomerModel> updateBusinessRegistration({
    required String customerId,
    required String businessName,
    required String pharmacyType,
    String? phone,
    String? email,
    String? address,
    String? city,
    String? province,
    String? nib,
    String? operationalLicenseNumber,
    String? npwp,
    String? siaNumber,
    String? siaExpiryDate,
    String? apjName,
    String? apjStraNumber,
    String? apjSipaNumber,
    String? apjSipaExpiryDate,
    String? apjPhone,
    String? apjEmail,
  }) async {
    final body = {
      'name': businessName,
      'pharmacy_type': pharmacyType,
      'is_pharmacy_facility': true,
      'phone': phone,
      'email': email,
      'address': address,
      'city': city,
      'province': province,
      'nib': nib,
      'operational_license_number': operationalLicenseNumber,
      'npwp': npwp,
      'sia_number': siaNumber,
      'sia_expiry_date': siaExpiryDate,
      'apj_name': apjName,
      'apj_stra_number': apjStraNumber,
      'apj_sipa_number': apjSipaNumber,
      'apj_sipa_expiry_date': apjSipaExpiryDate,
      'apj_phone': apjPhone,
      'apj_email': apjEmail,
      'customer_status': 'Menunggu Verifikasi', // Sent for Admin approval
    };

    final res = await ApiClient.put(
      '${ApiConfig.customers}/$customerId',
      body: body,
    );

    return CustomerModel.fromJson(res['data']);
  }
}
