import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/purchase_model.dart';
import '../../services/warehouse_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/status_badge.dart';

class PurchaseReceiveDetailScreen extends StatefulWidget {
  final PurchaseModel purchase;

  const PurchaseReceiveDetailScreen({super.key, required this.purchase});

  @override
  State<PurchaseReceiveDetailScreen> createState() => _PurchaseReceiveDetailScreenState();
}

class _PurchaseReceiveDetailScreenState extends State<PurchaseReceiveDetailScreen> {
  final _doNumberController = TextEditingController();
  final _pbfInvoiceNoController = TextEditingController();
  final _taxInvoiceNoController = TextEditingController();
  final _notesController = TextEditingController();

  late List<PurchaseItemModel> _items;
  late List<TextEditingController> _batchControllers;
  late List<TextEditingController> _edControllers;
  late List<TextEditingController> _qtyControllers;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _doNumberController.text = widget.purchase.pbfDeliveryOrderNo ?? '';
    _pbfInvoiceNoController.text = widget.purchase.pbfInvoiceNo ?? '';
    _taxInvoiceNoController.text = widget.purchase.taxInvoiceNo ?? '';
    _notesController.text = widget.purchase.notes ?? '';

    _items = widget.purchase.items.map((it) {
      return PurchaseItemModel(
        id: it.id,
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        unitName: it.unitName,
        qty: it.qty,
        receivedQty: it.receivedQty > 0 ? it.receivedQty : it.qty,
        batchNumber: it.batchNumber.isNotEmpty
            ? it.batchNumber
            : 'BATCH-${DateTime.now().year}${DateTime.now().month.toString().padLeft(2, '0')}',
        expiredDate: it.expiredDate.isNotEmpty
            ? it.expiredDate
            : '${DateTime.now().year + 2}-12-31',
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
      );
    }).toList();

    _batchControllers = _items.map((it) => TextEditingController(text: it.batchNumber)).toList();
    _edControllers = _items.map((it) => TextEditingController(text: it.expiredDate)).toList();
    _qtyControllers = _items.map((it) => TextEditingController(text: it.receivedQty.toInt().toString())).toList();
  }

  @override
  void dispose() {
    _doNumberController.dispose();
    _pbfInvoiceNoController.dispose();
    _taxInvoiceNoController.dispose();
    _notesController.dispose();
    for (var c in _batchControllers) {
      c.dispose();
    }
    for (var c in _edControllers) {
      c.dispose();
    }
    for (var c in _qtyControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickExpiredDate(int index) async {
    DateTime initial = DateTime.now().add(const Duration(days: 730));
    try {
      if (_items[index].expiredDate.isNotEmpty) {
        initial = DateTime.parse(_items[index].expiredDate);
      }
    } catch (_) {}

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      helpText: 'PILIH EXPIRED DATE OBAT',
      cancelText: 'BATAL',
      confirmText: 'PILIH',
    );

    if (picked != null) {
      final formatted = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      setState(() {
        _items[index].expiredDate = formatted;
        _edControllers[index].text = formatted;
      });
    }
  }

  Future<void> _handleSubmitVerification() async {
    if (_doNumberController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nomor Surat Jalan PBF wajib diisi'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    for (int i = 0; i < _items.length; i++) {
      final it = _items[i];
      if (it.batchNumber.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Nomor batch untuk "${it.productName}" wajib diisi'),
            backgroundColor: AppTheme.error,
          ),
        );
        return;
      }
      if (it.expiredDate.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Expired date untuk "${it.productName}" wajib diisi'),
            backgroundColor: AppTheme.error,
          ),
        );
        return;
      }
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.verified_outlined, color: AppTheme.primaryDark, size: 22),
            SizedBox(width: 8),
            Text('Simpan Verifikasi Gudang?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Pastikan nomor batch dan tanggal kadaluarsa (ED) sudah sesuai dengan fisik kemasan obat yang tiba dari ${widget.purchase.supplierName}.\n\nSetelah disimpan, data akan diteruskan ke Admin / Apoteker untuk persetujuan resmi.',
          style: const TextStyle(fontSize: 12, height: 1.35),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Periksa Kembali'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryDark,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Simpan'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    try {
      final itemsPayload = _items.map((it) {
        return {
          'product_id': it.productId,
          'qty': it.receivedQty,
          'received_qty': it.receivedQty,
          'batch_number': it.batchNumber.trim(),
          'expired_date': it.expiredDate.trim(),
        };
      }).toList();

      await WarehouseService.receivePurchaseGoods(
        purchaseId: widget.purchase.id,
        pbfDeliveryOrderNo: _doNumberController.text.trim(),
        pbfInvoiceNo: _pbfInvoiceNoController.text.trim(),
        taxInvoiceNo: _taxInvoiceNoController.text.trim(),
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
          title: const Text('Pemeriksaan Fisik Selesai!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: const Text(
            'Fisik barang telah berhasil dicatat beserta No. Batch dan Expired Date.\n\nStatus transaksi berubah menjadi "Verifikasi Gudang" dan siap disetujui oleh Apoteker Penanggung Jawab di Web ERP.',
            style: TextStyle(fontSize: 12.5, height: 1.35),
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
        SnackBar(content: Text('Gagal verifikasi: $e'), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.purchase;
    final isEditable = p.isWaitingReceipt;

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
              p.invoiceNo,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryDark,
              ),
            ),
            const Text(
              'Pemeriksaan Fisik Penerimaan Pembelian',
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
            // Status Card
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
                          const Icon(Icons.domain_rounded, size: 16, color: Color(0xFF0284C7)),
                          const SizedBox(width: 6),
                          Text(
                            p.supplierName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      StatusBadge(status: p.verificationStatus),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Gudang: ${p.warehouseName}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                        ),
                      ),
                      if (p.poOrderNo != null && p.poOrderNo!.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2FE),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Ref PO: ${p.poOrderNo}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0369A1),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Form Dokumen Fisik PBF
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
                      Icon(Icons.description_outlined, size: 18, color: AppTheme.primaryDark),
                      SizedBox(width: 8),
                      Text(
                        'Kelengkapan Dokumen Fisik PBF',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomTextField(
                    label: 'No. Surat Jalan PBF (Wajib) *',
                    hint: 'Contoh: DO/2026/XI/001...',
                    controller: _doNumberController,
                    enabled: isEditable,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: CustomTextField(
                          label: 'No. Faktur PBF',
                          hint: 'INV-PBF/123...',
                          controller: _pbfInvoiceNoController,
                          enabled: isEditable,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: CustomTextField(
                          label: 'No. Faktur Pajak',
                          hint: '010.002-26...',
                          controller: _taxInvoiceNoController,
                          enabled: isEditable,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomTextField(
                    label: 'Catatan Fisik Pengiriman PBF',
                    hint: 'Kondisi kemasan utuh, segel baik...',
                    controller: _notesController,
                    enabled: isEditable,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Item Check & Batch Allocation
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
                          Icon(Icons.medication_rounded, size: 18, color: Color(0xFF0284C7)),
                          SizedBox(width: 8),
                          Text(
                            'Pemeriksaan Fisik Batch & ED',
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
                          '${_items.length} Item',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Periksa fisik obat, cocokkan jumlah, nomor batch, dan tanggal kedaluwarsa.',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 14),

                  ..._items.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final it = entry.value;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                ),
                                child: const Icon(Icons.science_outlined, size: 18, color: AppTheme.primaryDark),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      it.productName,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      'Kode: ${it.productCode} • Satuan: ${it.unitName}',
                                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Qty Row
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFCBD5E1)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Qty Pesan (Faktur)', style: TextStyle(fontSize: 9.5, color: AppTheme.textSecondary)),
                                      Text(
                                        '${it.qty.toInt()} ${it.unitName}',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppTheme.primaryDark.withValues(alpha: 0.5)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Qty Fisik Datang *', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppTheme.primaryDark)),
                                      TextFormField(
                                        controller: _qtyControllers[idx],
                                        enabled: isEditable,
                                        keyboardType: TextInputType.number,
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                        decoration: const InputDecoration(
                                          isDense: true,
                                          contentPadding: EdgeInsets.symmetric(vertical: 4),
                                          border: InputBorder.none,
                                          enabledBorder: InputBorder.none,
                                          focusedBorder: InputBorder.none,
                                        ),
                                        onChanged: (v) {
                                          it.receivedQty = double.tryParse(v) ?? it.qty;
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Batch & ED Row
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Nomor Batch *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF0369A1))),
                                    const SizedBox(height: 4),
                                    Container(
                                      height: 38,
                                      padding: const EdgeInsets.symmetric(horizontal: 8),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                      ),
                                      child: TextField(
                                        controller: _batchControllers[idx],
                                        enabled: isEditable,
                                        style: const TextStyle(fontSize: 11.5, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                                        decoration: const InputDecoration(
                                          isDense: true,
                                          contentPadding: EdgeInsets.symmetric(vertical: 9),
                                          hintText: 'BATCH-001...',
                                          border: InputBorder.none,
                                          enabledBorder: InputBorder.none,
                                          focusedBorder: InputBorder.none,
                                        ),
                                        onChanged: (v) => it.batchNumber = v,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Expired Date (ED) *', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF0369A1))),
                                    const SizedBox(height: 4),
                                    InkWell(
                                      onTap: isEditable ? () => _pickExpiredDate(idx) : null,
                                      borderRadius: BorderRadius.circular(8),
                                      child: Container(
                                        height: 38,
                                        padding: const EdgeInsets.symmetric(horizontal: 8),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: const Color(0xFFCBD5E1)),
                                        ),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                it.expiredDate.isNotEmpty ? it.expiredDate : 'YYYY-MM-DD',
                                                style: TextStyle(
                                                  fontSize: 11.5,
                                                  fontFamily: 'monospace',
                                                  fontWeight: FontWeight.bold,
                                                  color: it.expiredDate.isNotEmpty ? AppTheme.textPrimary : AppTheme.textMuted,
                                                ),
                                              ),
                                            ),
                                            const Icon(Icons.calendar_today_rounded, size: 15, color: Color(0xFF0284C7)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Button
            if (isEditable) ...[
              CustomButton(
                text: 'Simpan Verifikasi Fisik Gudang',
                icon: Icons.check_circle_outline_rounded,
                isLoading: _isLoading,
                onPressed: _handleSubmitVerification,
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        p.isApprovedByAdmin
                            ? 'Faktur telah resmi disetujui oleh Apoteker dan stok obat telah masuk ke sistem.'
                            : 'Pemeriksaan fisik gudang telah selesai disimpan. Menunggu persetujuan Apoteker di Web ERP.',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF15803D), height: 1.3),
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
