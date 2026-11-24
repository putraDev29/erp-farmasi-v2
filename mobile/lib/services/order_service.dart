import '../config/api_config.dart';
import '../models/cart_item_model.dart';
import '../models/sales_order_model.dart';
import 'api_client.dart';

class OrderService {
  static Future<SalesOrderModel> createMarketplaceOrder({
    required String customerId,
    required String warehouseId,
    required List<CartItemModel> items,
    String? customerSpNumber,
    String? customerSpDate,
    String? notes,
  }) async {
    final body = {
      'customer_id': customerId,
      'warehouse_id': warehouseId,
      'source': 'MARKETPLACE',
      'type': 'MARKETPLACE',
      'marketplace_store': 'Aplikasi Mobile Apotek',
      'marketplace_order_no': customerSpNumber,
      'customer_sp_number': customerSpNumber,
      'customer_sp_date': customerSpDate,
      'notes': notes,
      'items': items.map((i) => i.toOrderItemJson()).toList(),
    };

    final res = await ApiClient.post(
      ApiConfig.salesOrders,
      body: body,
    );

    return SalesOrderModel.fromJson(res['data']);
  }

  static Future<List<SalesOrderModel>> getCustomerOrders({String? customerId}) async {
    final queryParams = <String, String>{
      'sort_by': 'date',
      'sort_dir': 'desc',
    };
    if (customerId != null) {
      queryParams['customer_id'] = customerId;
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

  static Future<SalesOrderModel> getOrderDetail(String orderId) async {
    final res = await ApiClient.get('${ApiConfig.salesOrders}/$orderId');
    return SalesOrderModel.fromJson(res['data']);
  }

  static Future<void> confirmReceivedOrder({
    required String orderId,
    required String receivedDate,
    required String receivedBy,
    String? notes,
  }) async {
    await ApiClient.post(
      '${ApiConfig.salesOrders}/$orderId/receive',
      body: {
        'received_date': receivedDate,
        'received_by': receivedBy,
        'received_notes': notes,
      },
    );
  }
}
