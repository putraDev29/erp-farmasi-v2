class DocumentModel {
  final String id;
  final String entityType;
  final String entityId;
  final String documentType;
  final String fileName;
  final String originalName;
  final String filePath;
  final int fileSize;
  final String mimeType;
  final String? notes;
  final String? expiryDate;
  final String createdAt;
  final String approvalStatus; // PENDING, APPROVED, REJECTED
  final String? approvalNotes;

  DocumentModel({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.documentType,
    required this.fileName,
    required this.originalName,
    required this.filePath,
    required this.fileSize,
    required this.mimeType,
    this.notes,
    this.expiryDate,
    required this.createdAt,
    this.approvalStatus = 'PENDING',
    this.approvalNotes,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id'] ?? '',
      entityType: json['entity_type'] ?? '',
      entityId: json['entity_id'] ?? '',
      documentType: json['document_type'] ?? '',
      fileName: json['file_name'] ?? '',
      originalName: json['original_name'] ?? '',
      filePath: json['file_path'] ?? '',
      fileSize: json['file_size'] ?? 0,
      mimeType: json['mime_type'] ?? '',
      notes: json['notes'],
      expiryDate: json['expiry_date'],
      createdAt: json['created_at'] ?? '',
      approvalStatus: json['approval_status'] ?? 'PENDING',
      approvalNotes: json['approval_notes'],
    );
  }
}
