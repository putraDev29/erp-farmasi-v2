import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../customer/customer_main_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _businessNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController(text: 'Pontianak');
  final _provinceController = TextEditingController(text: 'Kalimantan Barat');

  String _pharmacyType = 'APOTEK';
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _businessNameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _provinceController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.registerCustomer(
      username: _usernameController.text.trim(),
      password: _passwordController.text.trim(),
      fullName: _fullNameController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      businessName: _businessNameController.text.trim(),
      pharmacyType: _pharmacyType,
      address: _addressController.text.trim(),
      city: _cityController.text.trim(),
      province: _provinceController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registrasi berhasil! Silakan lengkapi dokumen usaha di menu Registrasi Usaha.'),
          backgroundColor: AppTheme.success,
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const CustomerMainScreen()),
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Registrasi gagal'),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Registrasi Pelanggan Baru'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Info Banner
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.verified_user_outlined, color: AppTheme.primaryDark, size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Pendaftaran Akun Fasilitas Farmasi (Apotek / Klinik / RS) untuk pemesanan obat resmi ke PBF.',
                          style: TextStyle(fontSize: 11, color: AppTheme.primaryDark, height: 1.3),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Data Akun Login
                const Text('1. Data Akun Pengguna', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                const SizedBox(height: 8),

                CustomTextField(
                  label: 'Nama Lengkap Pemohon / APJ *',
                  hint: 'Contoh: apt. Sarah Amalia, S.Farm.',
                  controller: _fullNameController,
                  validator: (v) => (v == null || v.isEmpty) ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 10),

                CustomTextField(
                  label: 'Nomor WhatsApp / HP Aktif *',
                  hint: '081234567890',
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  validator: (v) => (v == null || v.isEmpty) ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 10),

                CustomTextField(
                  label: 'Username Login *',
                  hint: 'apotek_sehat',
                  controller: _usernameController,
                  validator: (v) => (v == null || v.isEmpty) ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 10),

                CustomTextField(
                  label: 'Kata Sandi *',
                  hint: 'Minimal 6 karakter...',
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, size: 18),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                  validator: (v) => (v == null || v.length < 6) ? 'Minimal 6 karakter' : null,
                ),
                const SizedBox(height: 10),

                CustomTextField(
                  label: 'Email (Opsional)',
                  hint: 'sarah@apoteksehat.com',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 18),

                // Data Sarana Farmasi
                const Text('2. Data Fasilitas / Sarana Usaha', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                const SizedBox(height: 8),

                CustomTextField(
                  label: 'Nama Sarana / Usaha Farmasi *',
                  hint: 'Contoh: APOTEK SEHAT FARMA',
                  controller: _businessNameController,
                  validator: (v) => (v == null || v.isEmpty) ? 'Nama sarana wajib diisi' : null,
                ),
                const SizedBox(height: 10),

                // Tipe Sarana Dropdown
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
                        DropdownMenuItem(value: 'TOKO_OBAT', child: Text('Toko Obat Berizin')),
                      ],
                      onChanged: (v) => setState(() => _pharmacyType = v ?? 'APOTEK'),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                CustomTextField(
                  label: 'Alamat Lengkap Sarana *',
                  hint: 'Jl. Raya Gajah Mada No. 120...',
                  controller: _addressController,
                  maxLines: 2,
                  validator: (v) => (v == null || v.isEmpty) ? 'Alamat wajib diisi' : null,
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: CustomTextField(
                        label: 'Kota / Kabupaten *',
                        controller: _cityController,
                        validator: (v) => (v == null || v.isEmpty) ? 'Wajib diisi' : null,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: CustomTextField(
                        label: 'Provinsi *',
                        controller: _provinceController,
                        validator: (v) => (v == null || v.isEmpty) ? 'Wajib diisi' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Submit Button
                CustomButton(
                  text: 'Daftar Akun Sekarang',
                  isLoading: auth.status == AuthStatus.loading,
                  onPressed: _handleRegister,
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
