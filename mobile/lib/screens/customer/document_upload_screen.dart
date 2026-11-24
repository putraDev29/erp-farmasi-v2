import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/document_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/document_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/status_badge.dart';

class DocumentUploadScreen extends StatefulWidget {
  const DocumentUploadScreen({super.key});

  @override
  State<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends State<DocumentUploadScreen> {
  bool _isLoading = true;
  String? _uploadingType;
  List<DocumentModel> _documents = [];

  final List<Map<String, dynamic>> _documentTemplates = [
    {
      'type': 'NIB',
      'title': 'NIB (Nomor Induk Berusaha)',
      'desc': 'Dokumen legalitas berusaha resmi dari sistem OSS BKPM.',
      'required': true,
      'icon': Icons.business_outlined,
    },
    {
      'type': 'SIA',
      'title': 'Izin Operasional Sarana / SIA',
      'desc': 'Surat Izin Apotek (SIA) / Izin Operasional Klinik / RS dari Dinkes/DPMPTSP.',
      'required': true,
      'icon': Icons.local_hospital_outlined,
    },
    {
      'type': 'NPWP',
      'title': 'NPWP Badan Usaha / Sarana',
      'desc': 'Nomor Pokok Wajib Pajak untuk penerbitan faktur pajak resmi.',
      'required': true,
      'icon': Icons.receipt_long_outlined,
    },
    {
      'type': 'SIPA',
      'title': 'SIPA Apoteker Penanggung Jawab',
      'desc': 'Surat Izin Praktik Apoteker yang masih berlaku sesuai alamat sarana.',
      'required': true,
      'icon': Icons.badge_outlined,
    },
    {
      'type': 'STRA',
      'title': 'STRA Apoteker',
      'desc': 'Surat Tanda Registrasi Apoteker resmi dari Kemenkes RI / IAI.',
      'required': true,
      'icon': Icons.verified_user_outlined,
    },
    {
      'type': 'SK_APJ',
      'title': 'Surat Penunjukan / SK APJ',
      'desc': 'Surat pernyataan pengangkatan APJ oleh pimpinan sarana farmasi.',
      'required': false,
      'icon': Icons.assignment_ind_outlined,
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final custId = auth.customer?.id;
    if (custId == null || custId.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    setState(() => _isLoading = true);
    try {
      await auth.refreshProfile();
      final docs = await DocumentService.getDocuments(
        entityType: 'customer',
        entityId: custId,
      );
      if (mounted) {
        setState(() {
          _documents = docs;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat dokumen: $e'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  DocumentModel? _findDocument(String type) {
    try {
      return _documents.firstWhere((d) {
        final t = d.documentType.toUpperCase();
        final target = type.toUpperCase();
        if (t == target) return true;
        if (target == 'SIA' && (t == 'IZIN_OPERASIONAL' || t == 'IZIN_SARANA')) return true;
        if (target == 'SIPA' && t == 'SIPA_APJ') return true;
        if (target == 'STRA' && t == 'STR_APJ') return true;
        if (target == 'SK_APJ' && t == 'SURAT_PENUNJUKAN_APJ') return true;
        return false;
      });
    } catch (_) {
      return null;
    }
  }

  Future<void> _handlePickAndUpload(String docType) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final custId = auth.customer?.id;
    if (custId == null || custId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ID Pelanggan belum tersedia. Silakan isi form registrasi usaha terlebih dahulu.')),
      );
      return;
    }

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result == null || result.files.isEmpty || result.files.single.path == null) {
        return;
      }

      final filePath = result.files.single.path!;
      final fileName = result.files.single.name;

      setState(() => _uploadingType = docType);

      await DocumentService.uploadDocument(
        entityType: 'customer',
        entityId: custId,
        documentType: docType,
        filePath: filePath,
        notes: 'Diunggah via Mobile App oleh ${auth.user?.fullName ?? auth.user?.username}',
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Dokumen $fileName berhasil diunggah! Status: Menunggu Verifikasi Admin.'),
          backgroundColor: AppTheme.success,
        ),
      );

      await _loadDocuments();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengunggah dokumen: $e'), backgroundColor: AppTheme.error),
      );
    } finally {
      if (mounted) {
        setState(() => _uploadingType = null);
      }
    }
  }

  Future<void> _handleDelete(DocumentModel doc) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Dokumen?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Text('Anda yakin ingin menghapus berkas ${doc.documentType}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await DocumentService.deleteDocument(doc.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dokumen berhasil dihapus'), backgroundColor: AppTheme.success),
      );
      await _loadDocuments();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menghapus dokumen: $e'), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final customer = auth.customer;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Unggah Dokumen CDOB BPOM'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Segarkan',
            onPressed: _loadDocuments,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDocuments,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Information banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.shield_outlined, color: AppTheme.primaryDark, size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Legalitas & Kepatuhan Distribusi Obat',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryDark,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Berdasarkan Peraturan BPOM CDOB (Cara Distribusi Obat yang Baik), PBF hanya dapat melayani pemesanan dari sarana berizin resmi dengan APJ tersertifikasi. Dokumen yang Anda unggah akan diverifikasi oleh Admin/APJ PBF.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.textPrimary.withOpacity(0.8),
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Customer target summary
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderLight),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Sarana Terdaftar:',
                              style: TextStyle(fontSize: 10.5, color: AppTheme.textMuted),
                            ),
                            Text(
                              customer?.name ?? 'Nama Belum Diisi',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                        StatusBadge(
                          status: customer?.verificationStatus ?? 'PENDING',
                          fontSize: 10,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Daftar Berkas Persyaratan (PDF / JPG / PNG):',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // List of document cards
                  ..._documentTemplates.map((tmpl) {
                    final String type = tmpl['type'];
                    final String title = tmpl['title'];
                    final String desc = tmpl['desc'];
                    final bool isReq = tmpl['required'];
                    final IconData icon = tmpl['icon'];

                    final doc = _findDocument(type);
                    final isUploadingThis = _uploadingType == type;

                    return _buildDocumentCard(
                      type: type,
                      title: title,
                      desc: desc,
                      isRequired: isReq,
                      icon: icon,
                      doc: doc,
                      isUploading: isUploadingThis,
                    );
                  }).toList(),

                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildDocumentCard({
    required String type,
    required String title,
    required String desc,
    required bool isRequired,
    required IconData icon,
    required DocumentModel? doc,
    required bool isUploading,
  }) {
    final bool isUploaded = doc != null;
    final String approvalStatus = doc?.approvalStatus ?? '';

    Color cardBorder = AppTheme.borderLight;
    if (isUploaded) {
      if (approvalStatus == 'APPROVED') {
        cardBorder = AppTheme.success.withOpacity(0.5);
      } else if (approvalStatus == 'REJECTED') {
        cardBorder = AppTheme.error.withOpacity(0.5);
      } else {
        cardBorder = AppTheme.warning.withOpacity(0.5);
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cardBorder, width: isUploaded ? 1.4 : 1),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isUploaded ? AppTheme.primaryLight : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: isUploaded ? AppTheme.primaryDark : AppTheme.textMuted,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ),
                          if (isRequired)
                            const Text(' *', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        desc,
                        style: const TextStyle(fontSize: 10.5, color: AppTheme.textSecondary, height: 1.25),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),

            // File status or details
            if (isUploaded) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.check_circle, color: AppTheme.success, size: 14),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                doc.fileName,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Ukuran: ${(doc.fileSize / 1024).toStringAsFixed(1)} KB • Diunggah: ${doc.createdAt.split('T').first}',
                          style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(status: doc.approvalStatus, fontSize: 9.5),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.file_upload_outlined, size: 14),
                      label: Text(
                        isUploading ? 'Mengunggah...' : 'Ganti Berkas',
                        style: const TextStyle(fontSize: 11),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryDark,
                        side: const BorderSide(color: AppTheme.borderLight),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      onPressed: isUploading ? null : () => _handlePickAndUpload(type),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: AppTheme.error),
                    tooltip: 'Hapus Dokumen',
                    onPressed: () => _handleDelete(doc),
                  ),
                ],
              ),
            ] else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Belum Ada Berkas',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontStyle: FontStyle.italic),
                  ),
                  ElevatedButton.icon(
                    icon: isUploading
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.upload_file, size: 14),
                    label: Text(
                      isUploading ? 'Mengunggah...' : 'Pilih Berkas',
                      style: const TextStyle(fontSize: 11),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      elevation: 0,
                    ),
                    onPressed: isUploading ? null : () => _handlePickAndUpload(type),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
