import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../services/order_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class CheckoutOrderScreen extends StatefulWidget {
  const CheckoutOrderScreen({super.key});

  @override
  State<CheckoutOrderScreen> createState() => _CheckoutOrderScreenState();
}

class _CheckoutOrderScreenState extends State<CheckoutOrderScreen> {
  final _spNumberController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _spDate = DateTime.now();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _spNumberController.text = 'SP/ORD/${now.year}/${now.month}/${now.day}/${now.millisecondsSinceEpoch.toString().substring(8)}';
  }

  @override
  void dispose() {
    _spNumberController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String _formatCurrency(double amount) {
    final format = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    return format.format(amount);
  }

  Future<void> _handleSubmitOrder() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final cart = Provider.of<CartProvider>(context, listen: false);

    final custId = auth.customer?.id;
    if (custId == null || custId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profil sarana pelanggan tidak ditemukan. Silakan lengkapi Registrasi Usaha.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    if (cart.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Keranjang belanja kosong')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final formattedDate = DateFormat('yyyy-MM-dd').format(_spDate);

      // Create Sales Order in backend as Marketplace Order
      final createdOrder = await OrderService.createMarketplaceOrder(
        customerId: custId,
        warehouseId: auth.user?.branchId.isNotEmpty == true
            ? auth.user!.branchId
            : '00a3e80b-8e6e-4fc0-97ec-6c510608d7eb', // Default warehouse ID fallback
        items: cart.items.values.toList(),
        customerSpNumber: _spNumberController.text.trim(),
        customerSpDate: formattedDate,
        notes: _notesController.text.trim(),
      );

      cart.clear();

      if (!mounted) return;
      setState(() => _isLoading = false);

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: AppTheme.success, size: 48),
          title: const Text('Pesanan Berhasil Dikirim!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Nomor Pesanan: ${createdOrder.orderNo}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryDark),
              ),
              const SizedBox(height: 8),
              const Text(
                'Pesanan Anda telah masuk ke modul Penjualan Marketplace di ERP Farmasi dan akan diverifikasi oleh Admin/APJ sebelum dikirim oleh Gudang.',
                style: TextStyle(fontSize: 11.5, color: AppTheme.textSecondary, height: 1.3),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context); // Go back to customer main screen
              },
              child: const Text('Lihat Pesanan Saya'),
            ),
          ],
        ),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengirim pesanan: ${e.toString().replaceAll('Exception: ', '')}'),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final cust = auth.customer;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Konfirmasi & Checkout Pesanan'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Data Pemesan Sarana Farmasi
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.local_hospital_outlined, size: 16, color: AppTheme.primaryDark),
                        SizedBox(width: 6),
                        Text('Fasilitas Pemesan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 14),
                    Text(
                      cust?.name ?? 'Nama Sarana Belum Diisi',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tipe: ${cust?.pharmacyType ?? "APOTEK"} | Status: ${cust?.customerStatus ?? "Menunggu Verifikasi"}',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                    if (cust?.address != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Alamat: ${cust?.address}, ${cust?.city ?? ""}',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                    if (cust?.apjName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'APJ: ${cust?.apjName} (SIPA: ${cust?.apjSipaNumber ?? "-"})',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // 2. Kepatuhan Surat Pesanan (CDOB SP)
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.description_outlined, size: 16, color: AppTheme.secondary),
                        SizedBox(width: 6),
                        Text('Kelengkapan Surat Pesanan (SP)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 14),
                    CustomTextField(
                      label: 'Nomor Surat Pesanan (SP) Resmi Sarana *',
                      hint: 'Contoh: SP/AB/2026/XI/001',
                      controller: _spNumberController,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Tanggal SP', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                              const SizedBox(height: 4),
                              InkWell(
                                onTap: () async {
                                  final picked = await showDatePicker(
                                    context: context,
                                    initialDate: _spDate,
                                    firstDate: DateTime(2020),
                                    lastDate: DateTime(2030),
                                  );
                                  if (picked != null) {
                                    setState(() => _spDate = picked);
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppTheme.border),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(DateFormat('dd/MM/yyyy').format(_spDate), style: const TextStyle(fontSize: 12)),
                                      const Icon(Icons.calendar_today, size: 14, color: AppTheme.textSecondary),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    CustomTextField(
                      label: 'Catatan Pesanan (Opsional)',
                      hint: 'Instruksi khusus pengiriman atau keterangan...',
                      controller: _notesController,
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // 3. Ringkasan Obat yang Dipesan
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Daftar Obat Dipesan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        Text('${cart.itemCount} Item', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                      ],
                    ),
                    const Divider(height: 14),
                    ...cart.items.values.map((item) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.product.name} (${item.quantity.toInt()} ${item.product.unitName})',
                                style: const TextStyle(fontSize: 11.5, color: AppTheme.textPrimary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              _formatCurrency(item.total),
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                      );
                    }),
                    const Divider(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Pembelian:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        Text(
                          _formatCurrency(cart.grandTotal),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Submit Button
            CustomButton(
              text: 'Kirim Pesanan Obat (Marketplace)',
              isLoading: _isLoading,
              onPressed: _handleSubmitOrder,
            ),
          ],
        ),
      ),
    );
  }
}
