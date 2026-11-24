import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/sales_order_model.dart';
import '../../services/order_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/status_badge.dart';

class OrderDetailScreen extends StatefulWidget {
  final SalesOrderModel order;

  const OrderDetailScreen({super.key, required this.order});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  late SalesOrderModel _order;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _refreshDetail();
  }

  Future<void> _refreshDetail() async {
    try {
      final updated = await OrderService.getOrderDetail(_order.id);
      if (mounted) {
        setState(() => _order = updated);
      }
    } catch (_) {}
  }

  String _formatCurrency(double amount) {
    final format = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    return format.format(amount);
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      final d = DateTime.parse(dateStr);
      return DateFormat('dd/MM/yyyy HH:mm').format(d);
    } catch (_) {
      return dateStr;
    }
  }

  void _showConfirmReceiptDialog() {
    final nameController = TextEditingController();
    final notesController = TextEditingController();
    DateTime receiveDate = DateTime.now();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Konfirmasi Penerimaan Barang', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Pastikan fisik obat telah diperiksa sesuai dengan Surat Jalan pengiriman dari Gudang.',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 12),
                CustomTextField(
                  label: 'Nama Penerima di Apotek/Sarana *',
                  hint: 'apt. Sarah / Petugas Apotek...',
                  controller: nameController,
                ),
                const SizedBox(height: 10),
                CustomTextField(
                  label: 'Catatan Serah Terima (Kondisi Barang)',
                  hint: 'Kemasan rapi, segel utuh, suhu terjaga...',
                  controller: notesController,
                  maxLines: 2,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              onPressed: () async {
                if (nameController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Nama penerima wajib diisi')),
                  );
                  return;
                }

                Navigator.pop(ctx);
                setState(() => _isLoading = true);

                try {
                  await OrderService.confirmReceivedOrder(
                    orderId: _order.id,
                    receivedDate: DateFormat('yyyy-MM-dd HH:mm:ss').format(receiveDate),
                    receivedBy: nameController.text.trim(),
                    notes: notesController.text.trim(),
                  );
                  await _refreshDetail();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Konfirmasi penerimaan berhasil disimpan.'),
                        backgroundColor: AppTheme.success,
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Gagal konfirmasi: $e'), backgroundColor: AppTheme.error),
                    );
                  }
                } finally {
                  if (mounted) setState(() => _isLoading = false);
                }
              },
              child: const Text('Konfirmasi Diterima'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Pesanan: ${_order.orderNo}'),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshDetail,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _order.orderNo,
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                        ),
                        StatusBadge(status: _order.status, label: _order.processStatus),
                      ],
                    ),
                    const Divider(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Tanggal Pesan:', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                        Text(_formatDate(_order.date), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    if (_order.customerSpNumber != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('No. Surat Pesanan (SP):', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          Text(_order.customerSpNumber!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Surat Jalan & Status Pengiriman Gudang
            if (_order.deliveryOrderNo != null && _order.deliveryOrderNo!.isNotEmpty) ...[
              Card(
                margin: EdgeInsets.zero,
                color: const Color(0xFFF0FDF4),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.local_shipping, size: 16, color: AppTheme.success),
                          SizedBox(width: 6),
                          Text('Informasi Pengiriman Gudang', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.success)),
                        ],
                      ),
                      const Divider(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('No. Surat Jalan:', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          Text(_order.deliveryOrderNo!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                        ],
                      ),
                      if (_order.shippingDate != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Tanggal Dikirim:', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                            Text(_formatDate(_order.shippingDate), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                      if (_order.receivedBy != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Penerima:', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                            Text(_order.receivedBy!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.success)),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Item List
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Daftar Obat Dipesan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const Divider(height: 14),
                    ..._order.items.map((it) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    it.productName,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    '${it.qty.toInt()} ${it.unitName} @ ${_formatCurrency(it.unitPrice)}',
                                    style: const TextStyle(fontSize: 10.5, color: AppTheme.textSecondary),
                                  ),
                                  if (it.batchNumber != null && it.batchNumber!.isNotEmpty)
                                    Text(
                                      'Batch: ${it.batchNumber} | ED: ${it.expiredDate ?? "-"}',
                                      style: const TextStyle(fontSize: 10, color: AppTheme.secondary),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              _formatCurrency(it.lineTotal),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                      );
                    }),
                    const Divider(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Nilai Tagihan:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        Text(
                          _formatCurrency(_order.totalAmount),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Tombol Konfirmasi Diterima (Khusus jika sudah dikirim oleh gudang)
            if (_order.isShipped && !_order.isReceived) ...[
              CustomButton(
                text: 'Konfirmasi Barang Telah Diterima',
                icon: Icons.check_circle_outline,
                isLoading: _isLoading,
                backgroundColor: AppTheme.success,
                onPressed: _showConfirmReceiptDialog,
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
      ),
    );
  }
}
