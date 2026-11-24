import '../config/api_config.dart';
import '../models/document_model.dart';
import 'api_client.dart';

class DocumentService {
  static Future<List<DocumentModel>> getDocuments({
    required String entityType,
    required String entityId,
  }) async {
    final uri = Uri.parse(ApiConfig.documents).replace(queryParameters: {
      'entity_type': entityType,
      'entity_id': entityId,
    });

    final res = await ApiClient.get(uri.toString());
    List<dynamic> list = [];
    if (res is Map) {
      final d = res['data'];
      if (d is Iterable) {
        list = d.toList();
      } else if (d is Map && d['items'] is Iterable) {
        list = (d['items'] as Iterable).toList();
      }
    } else if (res is Iterable) {
      list = res.toList();
    }
    return list
        .whereType<Map>()
        .map((item) => DocumentModel.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  static Future<DocumentModel> uploadDocument({
    required String entityType,
    required String entityId,
    required String documentType,
    required String filePath,
    String? notes,
  }) async {
    final fields = <String, String>{
      'entity_type': entityType,
      'entity_id': entityId,
      'document_type': documentType,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };

    final res = await ApiClient.uploadMultipart(
      ApiConfig.documentUpload,
      filePath: filePath,
      fieldName: 'file',
      fields: fields,
    );

    return DocumentModel.fromJson(res['data']);
  }

  static Future<void> deleteDocument(String documentId) async {
    await ApiClient.delete('${ApiConfig.documents}/$documentId');
  }
}
