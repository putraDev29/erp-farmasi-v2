class CustomerModel {
  final String id;
  final String code;
  final String name;
  final String? customerGroupId;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final String? province;
  final String? contactPerson;
  final String? notes;
  final double creditLimit;
  final int termOfPaymentDays;
  final bool isPharmacyFacility;
  final String pharmacyType; // APOTEK, KLINIK, RUMAH_SAKIT, PBF
  final String customerStatus; // Menunggu Verifikasi, Terdaftar, Disetujui
  final bool isVerified;
  final String? verifiedNotes;
  final String? verifiedAt;

  String get verificationStatus => isVerified ? 'APPROVED' : customerStatus;

  // CDOB Compliance & Legal Documents
  final String? nib;
  final String? operationalLicenseNumber;
  final String? npwp;
  final String? siaNumber;
  final String? siaExpiryDate;
  final String? apjName;
  final String? apjStraNumber;
  final String? apjSipaNumber;
  final String? apjSipaExpiryDate;
  final String? apjPhone;
  final String? apjEmail;

  CustomerModel({
    required this.id,
    required this.code,
    required this.name,
    this.customerGroupId,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.province,
    this.contactPerson,
    this.notes,
    this.creditLimit = 0.0,
    this.termOfPaymentDays = 30,
    this.isPharmacyFacility = true,
    this.pharmacyType = 'APOTEK',
    this.customerStatus = 'Menunggu Verifikasi',
    this.isVerified = false,
    this.verifiedNotes,
    this.verifiedAt,
    this.nib,
    this.operationalLicenseNumber,
    this.npwp,
    this.siaNumber,
    this.siaExpiryDate,
    this.apjName,
    this.apjStraNumber,
    this.apjSipaNumber,
    this.apjSipaExpiryDate,
    this.apjPhone,
    this.apjEmail,
  });

  bool get isApproved => isVerified || customerStatus == 'Disetujui' || customerStatus == 'Terverifikasi';

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      customerGroupId: json['customer_group_id'],
      phone: json['phone'],
      email: json['email'],
      address: json['address'],
      city: json['city'],
      province: json['province'],
      contactPerson: json['contact_person'],
      notes: json['notes'],
      creditLimit: (json['credit_limit'] as num?)?.toDouble() ?? 0.0,
      termOfPaymentDays: json['term_of_payment_days'] ?? 30,
      isPharmacyFacility: json['is_pharmacy_facility'] ?? true,
      pharmacyType: json['pharmacy_type'] ?? 'APOTEK',
      customerStatus: json['customer_status'] ?? 'Menunggu Verifikasi',
      isVerified: json['is_verified'] ?? false,
      verifiedNotes: json['verified_notes'],
      verifiedAt: json['verified_at'],
      nib: json['nib'],
      operationalLicenseNumber: json['operational_license_number'],
      npwp: json['npwp'],
      siaNumber: json['sia_number'],
      siaExpiryDate: json['sia_expiry_date'],
      apjName: json['apj_name'],
      apjStraNumber: json['apj_stra_number'],
      apjSipaNumber: json['apj_sipa_number'],
      apjSipaExpiryDate: json['apj_sipa_expiry_date'],
      apjPhone: json['apj_phone'],
      apjEmail: json['apj_email'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'customer_group_id': customerGroupId,
      'phone': phone,
      'email': email,
      'address': address,
      'city': city,
      'province': province,
      'contact_person': contactPerson,
      'notes': notes,
      'credit_limit': creditLimit,
      'term_of_payment_days': termOfPaymentDays,
      'is_pharmacy_facility': isPharmacyFacility,
      'pharmacy_type': pharmacyType,
      'customer_status': customerStatus,
      'is_verified': isVerified,
      'verified_notes': verifiedNotes,
      'verified_at': verifiedAt,
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
    };
  }
}
