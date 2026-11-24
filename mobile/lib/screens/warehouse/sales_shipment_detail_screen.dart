import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/sales_order_model.dart';
import '../../services/warehouse_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/status_badge.dart';

class SalesShipmentDetailScreen extends StatefulWidget {
  final SalesOrderModel order;

  const SalesShipmentDetailScreen({super.key, required this.order});

  @override
  State<SalesShipmentDetailScreen> createState() => _SalesShipmentDetailScreenState();
}

class _SalesShipmentDetailScreenState extends State<SalesShipmentDetailScreen> {
  final _deliveryOrderNoController = TextEditingController();
  final _courierController = TextEditingController(text: 'Kurir Internal PBF');
  final _trackingNumberController = TextEditingController();
  final _notesController = TextEditingController();

  final DateTime _shippingDate = DateTime.now();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _deliveryOrderNoController.text = widget.order.deliveryOrderNo?.isNotEmpty == true
        ? widget.order.deliveryOrderNo!
        : 'SJ/${now.year}/${now.month}/${widget.order.orderNo.split('/').last}';
    _notesController.text = widget.order.notes ?? '';
  }

  @override
  void dispose() {
    _deliveryOrderNoController.dispose();
    _courierController.dispose();
    _trackingNumberController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleShipOrder() async {
    if (_deliveryOrderNoController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nomor Surat Jalan wajib diisi'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.local_shipping_rounded, color: AppTheme.primaryDark, size: 22),
            SizedBox(width: 8),
            Text('Kirim Pesanan Obat?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Stok obat pada kartu stok Gudang Utama akan langsung terpotong (MUTASI KELUAR) secara real-time saat Surat Jalan diterbitkan.',
              style: TextStyle(fontSize: 12, height: 1.35),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'No. Surat Jalan: ${_deliveryOrderNoController.text.trim()}',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Tujuan: ${widget.order.customerName}',
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryDark,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Kirim Sekarang'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    try {
      final itemsPayload = widget.order.items.map((it) {
        return {
          'product_id': it.productId,
          'qty': it.qty,
          'shipped_qty': it.qty,
          'batch_number': it.batchNumber ?? 'BATCH-DEFAULT',
          'expired_date': it.expiredDate ?? '${DateTime.now().year + 2}-12-31',
        };
      }).toList();

      final formattedDate = DateFormat('yyyy-MM-dd HH:mm:ss').format(_shippingDate);

      await WarehouseService.shipSalesOrder(
        orderId: widget.order.id,
        deliveryOrderNo: _deliveryOrderNoController.text.trim(),
        shippingDate: formattedDate,
        courierName: _courierController.text.trim(),
        trackingNumber: _trackingNumberController.text.trim(),
        notes: _notesController.text.trim(),
        items: itemsPayload,
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          icon: const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 48),
          title: const Text('Barang Berhasil Dikirim!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: Text(
            'Surat Jalan ${_deliveryOrderNoController.text.trim()} telah diterbitkan.\n\nStok obat resmi terpotong dari Gudang Utama dan status pesanan berubah menjadi "Dikirim".',
            style: const TextStyle(fontSize: 12.5, height: 1.35),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              child: const Text('Kembali ke Daftar'),
            ),
          ],
        ),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengirim pesanan: $e'), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final canShip = o.processStatus == 'Diproses' || o.status == 'CONFIRMED';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              o.orderNo,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryDark,
              ),
            ),
            const Text(
              'Pengiriman & Penerbitan Surat Jalan',
              style: TextStyle(fontSize: 10.5, color: AppTheme.textSecondary),
            ),
          ],
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Customer Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.local_pharmacy_rounded, size: 16, color: Color(0xFF0284C7)),
                          const SizedBox(width: 6),
                          Text(
                            o.customerName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      StatusBadge(status: o.status, label: o.processStatus),
                    ],
                  ),
                  if (o.customer?.address?.isNotEmpty == true) ...[
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF64748B)),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            '${o.customer!.address}, ${o.customer!.city ?? ""}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      if (o.customerSpNumber != null && o.customerSpNumber!.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'No. SP: ${o.customerSpNumber}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0369A1),
                            ),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Sumber: ${o.source}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Form Penerbitan Surat Jalan
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.local_shipping_outlined, size: 18, color: AppTheme.primaryDark),
                      SizedBox(width: 8),
                      Text(
                        'Penerbitan Surat Jalan (SJ) Pengiriman',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomTextField(
                    label: 'Nomor Surat Jalan Resmi *',
                    hint: 'Contoh: SJ/2026/XI/001...',
                    controller: _deliveryOrderNoController,
                    enabled: canShip,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: CustomTextField(
                          label: 'Kurir / Pengantar',
                          hint: 'Kurir Internal / Ekspedisi...',
                          controller: _courierController,
                          enabled: canShip,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: CustomTextField(
                          label: 'No. Resi / Plat Armada',
                          hint: 'Contoh: KB 1234 XX...',
                          controller: _trackingNumberController,
                          enabled: canShip,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomTextField(
                    label: 'Catatan Pengiriman Petugas Gudang',
                    hint: 'Kemasan utuh, kardus tersegel rapi...',
                    controller: _notesController,
                    enabled: canShip,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Item Preparation Checklist
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.inventory_2_outlined, size: 18, color: Color(0xFF0284C7)),
                          SizedBox(width: 8),
                          Text(
                            'Daftar Obat yang Disiapkan Gudang',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${o.items.length} Item',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  ...o.items.map((it) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: const Icon(Icons.medication_outlined, size: 16, color: Color(0xFF0284C7)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  it.productName,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Text(
                                  'Kode: ${it.productCode}',
                                  style: const TextStyle(fontSize: 10.5, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${it.qty.toInt()} ${it.unitName}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Button Kirim Barang
            if (canShip) ...[
              CustomButton(
                text: 'Kirim Barang & Terbitkan Surat Jalan',
                icon: Icons.local_shipping_rounded,
                isLoading: _isLoading,
                onPressed: _handleShipOrder,
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            o.processStatus == 'Selesai'
                                ? 'Barang telah diterima oleh sarana pelanggan.'
                                : 'Barang telah dikirim dengan No. SJ: ${o.deliveryOrderNo ?? "-"}.',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF15803D),
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Stok kartu stok Gudang Utama resmi terpotong (MUTASI KELUAR).',
                            style: TextStyle(fontSize: 11, color: Color(0xFF16A34A)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
