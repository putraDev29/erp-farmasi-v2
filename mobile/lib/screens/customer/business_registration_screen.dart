import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/customer_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/customer_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/status_badge.dart';
import 'document_upload_screen.dart';

class BusinessRegistrationScreen extends StatefulWidget {
  const BusinessRegistrationScreen({super.key});

  @override
  State<BusinessRegistrationScreen> createState() => _BusinessRegistrationScreenState();
}

class _BusinessRegistrationScreenState extends State<BusinessRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _businessNameController;
  late TextEditingController _nibController;
  late TextEditingController _siaController;
  late TextEditingController _siaExpiryController;
  late TextEditingController _npwpController;
  late TextEditingController _addressController;
  late TextEditingController _cityController;
  late TextEditingController _provinceController;

  late TextEditingController _apjNameController;
  late TextEditingController _apjStraController;
  late TextEditingController _apjSipaController;
  late TextEditingController _apjSipaExpiryController;
  late TextEditingController _apjPhoneController;
  late TextEditingController _apjEmailController;

  String _pharmacyType = 'APOTEK';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final cust = auth.customer;

    _businessNameController = TextEditingController(text: cust?.name ?? '');
    _nibController = TextEditingController(text: cust?.nib ?? '');
    _siaController = TextEditingController(text: cust?.siaNumber ?? cust?.operationalLicenseNumber ?? '');
    _siaExpiryController = TextEditingController(text: cust?.siaExpiryDate ?? '');
    _npwpController = TextEditingController(text: cust?.npwp ?? '');
    _addressController = TextEditingController(text: cust?.address ?? '');
    _cityController = TextEditingController(text: cust?.city ?? 'Pontianak');
    _provinceController = TextEditingController(text: cust?.province ?? 'Kalimantan Barat');

    _apjNameController = TextEditingController(text: cust?.apjName ?? auth.user?.fullName ?? '');
    _apjStraController = TextEditingController(text: cust?.apjStraNumber ?? '');
    _apjSipaController = TextEditingController(text: cust?.apjSipaNumber ?? '');
    _apjSipaExpiryController = TextEditingController(text: cust?.apjSipaExpiryDate ?? '');
    _apjPhoneController = TextEditingController(text: cust?.apjPhone ?? auth.user?.phone ?? '');
    _apjEmailController = TextEditingController(text: cust?.apjEmail ?? auth.user?.email ?? '');

    _pharmacyType = cust?.pharmacyType ?? 'APOTEK';

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await auth.refreshProfile();
      if (mounted) {
        final refreshedCust = auth.customer;
        if (refreshedCust != null) {
          setState(() {
            if (_businessNameController.text.isEmpty) _businessNameController.text = refreshedCust.name;
            if (_nibController.text.isEmpty) _nibController.text = refreshedCust.nib ?? '';
            if (_siaController.text.isEmpty) _siaController.text = refreshedCust.siaNumber ?? refreshedCust.operationalLicenseNumber ?? '';
            if (_siaExpiryController.text.isEmpty) _siaExpiryController.text = refreshedCust.siaExpiryDate ?? '';
            if (_npwpController.text.isEmpty) _npwpController.text = refreshedCust.npwp ?? '';
            if (_addressController.text.isEmpty) _addressController.text = refreshedCust.address ?? '';
            if (_apjNameController.text.isEmpty) _apjNameController.text = refreshedCust.apjName ?? auth.user?.fullName ?? '';
            if (_apjStraController.text.isEmpty) _apjStraController.text = refreshedCust.apjStraNumber ?? '';
            if (_apjSipaController.text.isEmpty) _apjSipaController.text = refreshedCust.apjSipaNumber ?? '';
            if (_apjSipaExpiryController.text.isEmpty) _apjSipaExpiryController.text = refreshedCust.apjSipaExpiryDate ?? '';
            if (_apjPhoneController.text.isEmpty) _apjPhoneController.text = refreshedCust.apjPhone ?? auth.user?.phone ?? '';
            if (_apjEmailController.text.isEmpty) _apjEmailController.text = refreshedCust.apjEmail ?? auth.user?.email ?? '';
            _pharmacyType = refreshedCust.pharmacyType;
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _businessNameController.dispose();
    _nibController.dispose();
    _siaController.dispose();
    _siaExpiryController.dispose();
    _npwpController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _provinceController.dispose();
    _apjNameController.dispose();
    _apjStraController.dispose();
    _apjSipaController.dispose();
    _apjSipaExpiryController.dispose();
    _apjPhoneController.dispose();
    _apjEmailController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final custId = auth.customer?.id;

    if (custId == null || custId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ID Pelanggan tidak ditemukan')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final updatedCust = await CustomerService.updateBusinessRegistration(
        customerId: custId,
        businessName: _businessNameController.text.trim(),
        pharmacyType: _pharmacyType,
        address: _addressController.text.trim(),
        city: _cityController.text.trim(),
        province: _provinceController.text.trim(),
        nib: _nibController.text.trim(),
        operationalLicenseNumber: _siaController.text.trim(),
        siaNumber: _siaController.text.trim(),
        siaExpiryDate: _siaExpiryController.text.trim(),
        npwp: _npwpController.text.trim(),
        apjName: _apjNameController.text.trim(),
        apjStraNumber: _apjStraController.text.trim(),
        apjSipaNumber: _apjSipaController.text.trim(),
        apjSipaExpiryDate: _apjSipaExpiryController.text.trim(),
        apjPhone: _apjPhoneController.text.trim(),
        apjEmail: _apjEmailController.text.trim(),
      );

      auth.updateCustomerProfile(updatedCust);

      if (!mounted) return;
      setState(() => _isLoading = false);

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: AppTheme.success, size: 48),
          title: const Text('Data Berhasil Dikirim ke Admin', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: const Text(
            'Data registrasi sarana dan informasi legalitas CDOB BPOM Anda telah masuk ke sistem web ERP. Admin Apotek / PBF akan memverifikasi data dan dokumen sarana Anda.',
            style: TextStyle(fontSize: 12, height: 1.3),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK, Mengerti'),
            ),
          ],
        ),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menyimpan: $e'), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final cust = auth.customer;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(14),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Verification Status Banner
              Card(
                margin: EdgeInsets.zero,
                color: cust?.isVerified == true ? const Color(0xFFF0FDF4) : const Color(0xFFFFFBEB),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(
                        cust?.isVerified == true ? Icons.verified : Icons.pending_actions,
                        color: cust?.isVerified == true ? AppTheme.success : AppTheme.warning,
                        size: 28,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Status Verifikasi Admin:',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                                StatusBadge(
                                  status: cust?.customerStatus ?? 'Menunggu Verifikasi',
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              cust?.isVerified == true
                                  ? 'Sarana Anda telah diverifikasi & disetujui Admin. Legalitas CDOB BPOM aktif.'
                                  : 'Silakan lengkapi data dan dokumen di bawah ini untuk diverifikasi oleh Admin PBF.',
                              style: TextStyle(
                                fontSize: 10.5,
                                color: cust?.isVerified == true ? AppTheme.success : AppTheme.warning,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Section 1: Data Fasilitas
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '1. Data Fasilitas / Sarana Usaha',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      const Divider(height: 16),

                      CustomTextField(
                        label: 'Nama Resmi Sarana *',
                        hint: 'APOTEK BERKAT SEHAT',
                        controller: _businessNameController,
                        validator: (v) => (v == null || v.isEmpty) ? 'Wajib diisi' : null,
                      ),
                      const SizedBox(height: 10),

                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Tipe Fasilitas Farmasi *', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<String>(
                            value: _pharmacyType,
                            decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                            items: const [
                              DropdownMenuItem(value: 'APOTEK', child: Text('Apotek')),
                              DropdownMenuItem(value: 'KLINIK', child: Text('Klinik')),
                              DropdownMenuItem(value: 'RUMAH_SAKIT', child: Text('Rumah Sakit (RS)')),
                              DropdownMenuItem(value: 'PBF', child: Text('Pedagang Besar Farmasi (PBF)')),
                            ],
                            onChanged: (v) => setState(() => _pharmacyType = v ?? 'APOTEK'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: CustomTextField(
                              label: 'Nomor NIB *',
                              hint: '9120001234567',
                              controller: _nibController,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: CustomTextField(
                              label: 'Nomor NPWP *',
                              hint: '01.234.567.8-001.000',
                              controller: _npwpController,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: CustomTextField(
                              label: 'No. Izin Operasional / SIA *',
                              hint: 'SIA/503/001/2026',
                              controller: _siaController,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: CustomTextField(
                              label: 'Masa Berlaku SIA (YYYY-MM-DD)',
                              hint: '2028-12-31',
                              controller: _siaExpiryController,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      CustomTextField(
                        label: 'Alamat Lengkap Sarana *',
                        controller: _addressController,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: CustomTextField(
                              label: 'Kota / Kabupaten *',
                              controller: _cityController,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: CustomTextField(
                              label: 'Provinsi *',
                              controller: _provinceController,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Section 2: Data APJ
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '2. Data Apoteker Penanggung Jawab (APJ)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      const Divider(height: 16),

                      CustomTextField(
                        label: 'Nama Lengkap APJ *',
                        hint: 'apt. Rahmat Hidayat, S.Farm.',
                        controller: _apjNameController,
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: CustomTextField(
                              label: 'No. SIPA APJ *',
                              hint: '19920101/SIPA_61.71/2022',
                              controller: _apjSipaController,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: CustomTextField(
                              label: 'Masa Berlaku SIPA',
                              hint: '2027-11-20',
                              controller: _apjSipaExpiryController,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: CustomTextField(
                              label: 'No. STRA APJ',
                              hint: '19920101/STRA-UI/2018',
                              controller: _apjStraController,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: CustomTextField(
                              label: 'No. HP / WhatsApp APJ *',
                              hint: '08124984426',
                              controller: _apjPhoneController,
                              keyboardType: TextInputType.phone,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Section 3: Dokumen Kepatuhan Legalitas (CDOB BPOM)
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.folder_shared_outlined, size: 16, color: AppTheme.primaryDark),
                          SizedBox(width: 6),
                          Text(
                            '3. Dokumen Lampiran Kepatuhan CDOB BPOM',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                        ],
                      ),
                      const Divider(height: 14),
                      const Text(
                        'Pastikan dokumen fisik sarana telah dipersiapkan dan diunggah untuk verifikasi keabsahan rantai pasok obat resmi (CDOB BPOM):',
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.3),
                      ),
                      const SizedBox(height: 10),

                      _buildDocItem(title: 'NIB (Nomor Induk Berusaha)', status: _nibController.text.isNotEmpty ? 'Tercatat' : 'Belum Diisi', isRequired: true),
                      _buildDocItem(title: 'Izin Operasional / SIA Fasilitas', status: _siaController.text.isNotEmpty ? 'Tercatat' : 'Belum Diisi', isRequired: true),
                      _buildDocItem(title: 'NPWP Fasilitas / Sarana', status: _npwpController.text.isNotEmpty ? 'Tercatat' : 'Belum Diisi', isRequired: true),
                      _buildDocItem(title: 'SIPA Apoteker Penanggung Jawab', status: _apjSipaController.text.isNotEmpty ? 'Tercatat' : 'Belum Diisi', isRequired: true),
                      _buildDocItem(title: 'STRA Apoteker', status: _apjStraController.text.isNotEmpty ? 'Tercatat' : 'Opsional', isRequired: false),
                      _buildDocItem(title: 'Surat Penunjukan / SK APJ', status: 'Sesuai Format PBF', isRequired: false),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.cloud_upload_outlined, size: 16),
                          label: const Text('Kelola & Unggah Berkas Dokumen CDOB', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.primaryDark,
                            side: const BorderSide(color: AppTheme.primary, width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const DocumentUploadScreen()),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Save Button
              CustomButton(
                text: 'Kirim Data & Dokumen untuk Verifikasi Admin',
                icon: Icons.send_outlined,
                isLoading: _isLoading,
                onPressed: _handleSave,
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocItem({required String title, required String status, required bool isRequired}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.description, size: 14, color: AppTheme.primaryDark),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
              if (isRequired)
                const Text(' *', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold)),
            ],
          ),
          Text(
            status,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: status == 'Tercatat' ? AppTheme.success : AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
