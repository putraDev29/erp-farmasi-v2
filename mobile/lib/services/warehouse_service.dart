import '../config/api_config.dart';
import '../models/purchase_model.dart';
import '../models/sales_order_model.dart';
import 'api_client.dart';

class WarehouseService {
  // 1. PEMBELIAN - Daftar Penerimaan Barang dari PBF
  static Future<List<PurchaseModel>> getPurchasesForReceipt({String? status}) async {
    final queryParams = <String, String>{
      'sort_by': 'created_at',
      'sort_dir': 'desc',
    };
    if (status != null && status.isNotEmpty) {
      queryParams['verification_status'] = status;
    }

    final uri = Uri.parse(ApiConfig.purchases).replace(queryParameters: queryParams);
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
        .map((item) => PurchaseModel.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  static Future<PurchaseModel> getPurchaseDetail(String purchaseId) async {
    final res = await ApiClient.get('${ApiConfig.purchases}/$purchaseId');
    return PurchaseModel.fromJson(res['data']);
  }

  // Verifikasi Fisik Penerimaan Barang oleh Petugas Gudang
  static Future<void> receivePurchaseGoods({
    required String purchaseId,
    String? pbfDeliveryOrderNo,
    String? pbfInvoiceNo,
    String? taxInvoiceNo,
    required List<Map<String, dynamic>> items,
    String? notes,
  }) async {
    final body = {
      'pbf_delivery_order_no': pbfDeliveryOrderNo,
      'pbf_invoice_no': pbfInvoiceNo,
      'tax_invoice_no': taxInvoiceNo,
      'notes': notes,
      'items': items,
    };

    await ApiClient.post(
      '${ApiConfig.purchases}/$purchaseId/receive',
      body: body,
    );
  }

  // 2. PENJUALAN - Daftar Pengiriman Barang ke Pelanggan
  static Future<List<SalesOrderModel>> getSalesForShipment({String? processStatus}) async {
    final queryParams = <String, String>{
      'sort_by': 'date',
      'sort_dir': 'desc',
    };
    if (processStatus != null && processStatus.isNotEmpty) {
      queryParams['process_status'] = processStatus;
    }

    final uri = Uri.parse(ApiConfig.salesOrders).replace(queryParameters: queryParams);
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
        .map((item) => SalesOrderModel.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  // Verifikasi Pengiriman Barang & Surat Jalan oleh Petugas Gudang
  static Future<void> shipSalesOrder({
    required String orderId,
    required String deliveryOrderNo,
    required String shippingDate,
    String? courierName,
    String? trackingNumber,
    String? notes,
    required List<Map<String, dynamic>> items,
  }) async {
    final body = {
      'delivery_order_no': deliveryOrderNo,
      'shipping_date': shippingDate,
      'courier_name': courierName,
      'tracking_number': trackingNumber,
      'notes': notes,
      'items': items,
    };

    await ApiClient.post(
      '${ApiConfig.salesOrders}/$orderId/ship',
      body: body,
    );
  }
}
