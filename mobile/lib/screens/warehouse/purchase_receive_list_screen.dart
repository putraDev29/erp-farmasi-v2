import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/purchase_model.dart';
import '../../services/warehouse_service.dart';
import '../../widgets/status_badge.dart';
import 'purchase_receive_detail_screen.dart';

class PurchaseReceiveListScreen extends StatefulWidget {
  const PurchaseReceiveListScreen({super.key});

  @override
  State<PurchaseReceiveListScreen> createState() => _PurchaseReceiveListScreenState();
}

class _PurchaseReceiveListScreenState extends State<PurchaseReceiveListScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<PurchaseModel> _purchases = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedFilter = 'MENUNGGU_PENERIMAAN';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadPurchases();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPurchases() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await WarehouseService.getPurchasesForReceipt(
        status: _selectedFilter == 'ALL' ? null : _selectedFilter,
      );

      if (mounted) {
        setState(() {
          _purchases = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  List<PurchaseModel> get _filteredPurchases {
    if (_searchQuery.trim().isEmpty) {
      return _purchases;
    }
    final q = _searchQuery.toLowerCase().trim();
    return _purchases.where((p) {
      final matchInvoice = p.invoiceNo.toLowerCase().contains(q);
      final matchSupplier = p.supplierName.toLowerCase().contains(q) ||
          p.supplierCode.toLowerCase().contains(q);
      final matchPo = p.poOrderNo?.toLowerCase().contains(q) ?? false;
      final matchDo = p.pbfDeliveryOrderNo?.toLowerCase().contains(q) ?? false;
      final matchItem = p.items.any((it) =>
          it.productName.toLowerCase().contains(q) ||
          it.productCode.toLowerCase().contains(q));
      return matchInvoice || matchSupplier || matchPo || matchDo || matchItem;
    }).toList();
  }

  String _formatDate(String dateStr) {
    try {
      final d = DateTime.parse(dateStr);
      return DateFormat('dd MMM yyyy, HH:mm').format(d);
    } catch (_) {
      return dateStr;
    }
  }

  // Count helper
  int _countByStatus(String status) {
    if (status == 'ALL') return _purchases.length;
    return _purchases.where((p) => p.verificationStatus == status).length;
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    final count = _selectedFilter == value ? _purchases.length : _countByStatus(value);

    return InkWell(
      onTap: () {
        if (_selectedFilter != value) {
          setState(() {
            _selectedFilter = value;
          });
          _loadPurchases();
        }
      },
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryDark : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primaryDark : const Color(0xFFCBD5E1),
            width: isSelected ? 1.4 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryDark.withValues(alpha: 0.2),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : AppTheme.textSecondary,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.25)
                      : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : AppTheme.textSecondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredPurchases;

    return Column(
      children: [
        // Top Container: Search & Summary
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Box
              Container(
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(fontSize: 12.5),
                  decoration: InputDecoration(
                    hintText: 'Cari no faktur, supplier, no SJ, atau obat...',
                    hintStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search_rounded, size: 19, color: Color(0xFF64748B)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 17, color: Color(0xFF64748B)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val);
                  },
                ),
              ),
              const SizedBox(height: 10),

              // Summary Stats Row
              Row(
                children: [
                  _buildSummaryCard(
                    title: 'Menunggu Datang',
                    value: '${_countByStatus("MENUNGGU_PENERIMAAN")}',
                    icon: Icons.hourglass_top_rounded,
                    color: const Color(0xFFD97706),
                    bgColor: const Color(0xFFFFFBEB),
                  ),
                  const SizedBox(width: 8),
                  _buildSummaryCard(
                    title: 'Verif. Gudang',
                    value: '${_countByStatus("VERIFIKASI_GUDANG")}',
                    icon: Icons.check_circle_outline_rounded,
                    color: const Color(0xFF0284C7),
                    bgColor: const Color(0xFFF0F9FF),
                  ),
                  const SizedBox(width: 8),
                  _buildSummaryCard(
                    title: 'Disetujui APJ',
                    value: '${_countByStatus("APPROVED")}',
                    icon: Icons.verified_rounded,
                    color: const Color(0xFF16A34A),
                    bgColor: const Color(0xFFF0FDF4),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('Menunggu Datang', 'MENUNGGU_PENERIMAAN'),
                    const SizedBox(width: 6),
                    _buildFilterChip('Verifikasi Gudang', 'VERIFIKASI_GUDANG'),
                    const SizedBox(width: 6),
                    _buildFilterChip('Disetujui Admin', 'APPROVED'),
                    const SizedBox(width: 6),
                    _buildFilterChip('Semua Faktur', 'ALL'),
                  ],
                ),
              ),
            ],
          ),
        ),

        const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

        // Purchases List
        Expanded(
          child: _isLoading
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(strokeWidth: 2.5),
                      SizedBox(height: 12),
                      Text('Memuat daftar faktur pembelian...', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                    ],
                  ),
                )
              : _errorMessage != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.error.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 36),
                            ),
                            const SizedBox(height: 12),
                            Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5, color: AppTheme.error)),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _loadPurchases,
                              icon: const Icon(Icons.refresh_rounded, size: 16),
                              label: const Text('Coba Lagi'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : filtered.isEmpty
                      ? Center(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFF1F5F9),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _searchQuery.isNotEmpty ? Icons.search_off_rounded : Icons.inventory_2_outlined,
                                    size: 42,
                                    color: AppTheme.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  _searchQuery.isNotEmpty
                                      ? 'Tidak ditemukan hasil pencarian'
                                      : 'Tidak ada data penerimaan',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _searchQuery.isNotEmpty
                                      ? 'Coba gunakan kata kunci nomor faktur atau nama obat lainnya.'
                                      : 'Belum ada faktur pembelian pada status filter ini.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                ),
                                const SizedBox(height: 16),
                                if (_searchQuery.isNotEmpty)
                                  OutlinedButton.icon(
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                    icon: const Icon(Icons.clear_rounded, size: 16),
                                    label: const Text('Reset Pencarian'),
                                  )
                                else
                                  ElevatedButton.icon(
                                    onPressed: _loadPurchases,
                                    icon: const Icon(Icons.refresh_rounded, size: 16),
                                    label: const Text('Segarkan Data'),
                                  ),
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadPurchases,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(14, 12, 14, 20),
                            itemCount: filtered.length,
                            itemBuilder: (context, idx) {
                              final p = filtered[idx];
                              final isWaiting = p.isWaitingReceipt;
                              final isVerified = p.isVerifiedByWarehouse;
                              final isApproved = p.isApprovedByAdmin;

                              final Color statusColor = isApproved
                                  ? const Color(0xFF16A34A)
                                  : (isVerified
                                      ? const Color(0xFF0284C7)
                                      : const Color(0xFFD97706));

                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.03),
                                      blurRadius: 5,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: IntrinsicHeight(
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        // Colored Left Accent Stripe
                                        Container(
                                          width: 5,
                                          color: statusColor,
                                        ),
                                        Expanded(
                                          child: InkWell(
                                            onTap: () async {
                                              await Navigator.of(context).push(
                                                MaterialPageRoute(
                                                  builder: (_) => PurchaseReceiveDetailScreen(purchase: p),
                                                ),
                                              );
                                              _loadPurchases();
                                            },
                                            child: Padding(
                                              padding: const EdgeInsets.all(12),
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  // Header: Invoice No + Status Badge
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      Text(
                                                        p.invoiceNo,
                                                        style: const TextStyle(
                                                          fontFamily: 'monospace',
                                                          fontSize: 13,
                                                          fontWeight: FontWeight.bold,
                                                          color: AppTheme.primaryDark,
                                                        ),
                                                      ),
                                                      StatusBadge(
                                                        status: p.verificationStatus,
                                                        label: isApproved
                                                            ? 'Disetujui Admin'
                                                            : (isVerified
                                                                ? 'Verifikasi Gudang'
                                                                : 'Menunggu Penerimaan'),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 6),

                                                  // Supplier Row
                                                  Row(
                                                    children: [
                                                      const Icon(Icons.domain_rounded, size: 14, color: Color(0xFF64748B)),
                                                      const SizedBox(width: 5),
                                                      Expanded(
                                                        child: Text(
                                                          p.supplierName,
                                                          style: const TextStyle(
                                                            fontSize: 12.5,
                                                            fontWeight: FontWeight.bold,
                                                            color: AppTheme.textPrimary,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 6),

                                                  // Tags Row: PO Ref & Items Count
                                                  Wrap(
                                                    spacing: 6,
                                                    runSpacing: 4,
                                                    children: [
                                                      if (p.poOrderNo != null && p.poOrderNo!.isNotEmpty)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                          decoration: BoxDecoration(
                                                            color: const Color(0xFFF1F5F9),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: Text(
                                                            'PO: ${p.poOrderNo}',
                                                            style: const TextStyle(
                                                              fontSize: 10,
                                                              fontWeight: FontWeight.w600,
                                                              color: Color(0xFF475569),
                                                            ),
                                                          ),
                                                        ),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                        decoration: BoxDecoration(
                                                          color: const Color(0xFFE0F2FE),
                                                          borderRadius: BorderRadius.circular(4),
                                                        ),
                                                        child: Text(
                                                          '${p.items.length} Macam Obat',
                                                          style: const TextStyle(
                                                            fontSize: 10,
                                                            fontWeight: FontWeight.bold,
                                                            color: Color(0xFF0284C7),
                                                          ),
                                                        ),
                                                      ),
                                                      if (p.pbfDeliveryOrderNo != null && p.pbfDeliveryOrderNo!.isNotEmpty)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                          decoration: BoxDecoration(
                                                            color: const Color(0xFFFEF3C7),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: Text(
                                                            'SJ: ${p.pbfDeliveryOrderNo}',
                                                            style: const TextStyle(
                                                              fontSize: 10,
                                                              fontWeight: FontWeight.w600,
                                                              color: Color(0xFFB45309),
                                                            ),
                                                          ),
                                                        ),
                                                    ],
                                                  ),

                                                  const SizedBox(height: 8),
                                                  const Divider(height: 1, thickness: 0.8, color: Color(0xFFF1F5F9)),
                                                  const SizedBox(height: 8),

                                                  // Footer Date & Action
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      Row(
                                                        children: [
                                                          const Icon(Icons.schedule_rounded, size: 12, color: Color(0xFF94A3B8)),
                                                          const SizedBox(width: 4),
                                                          Text(
                                                            _formatDate(p.date),
                                                            style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                                          ),
                                                        ],
                                                      ),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                                        decoration: BoxDecoration(
                                                          color: isWaiting
                                                              ? AppTheme.primaryLight
                                                              : const Color(0xFFF8FAFC),
                                                          borderRadius: BorderRadius.circular(6),
                                                          border: Border.all(
                                                            color: isWaiting
                                                                ? AppTheme.primaryDark.withValues(alpha: 0.3)
                                                                : const Color(0xFFCBD5E1),
                                                          ),
                                                        ),
                                                        child: Row(
                                                          mainAxisSize: MainAxisSize.min,
                                                          children: [
                                                            Icon(
                                                              isWaiting ? Icons.inventory_rounded : Icons.visibility_rounded,
                                                              size: 13,
                                                              color: isWaiting ? AppTheme.primaryDark : const Color(0xFF475569),
                                                            ),
                                                            const SizedBox(width: 4),
                                                            Text(
                                                              isWaiting ? 'Periksa & Terima' : 'Lihat Detail',
                                                              style: TextStyle(
                                                                fontSize: 11,
                                                                fontWeight: FontWeight.bold,
                                                                color: isWaiting ? AppTheme.primaryDark : const Color(0xFF475569),
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}
