import 'package:flutter/material.dart';
import '../models/purchase_model.dart';
import '../models/sales_order_model.dart';
import '../services/warehouse_service.dart';

class WarehouseProvider with ChangeNotifier {
  // Pembelian
  List<PurchaseModel> _purchases = [];
  bool _isLoadingPurchases = false;
  String? _purchaseError;

  // Penjualan
  List<SalesOrderModel> _salesOrders = [];
  bool _isLoadingSales = false;
  String? _salesError;

  List<PurchaseModel> get purchases => _purchases;
  bool get isLoadingPurchases => _isLoadingPurchases;
  String? get purchaseError => _purchaseError;

  List<SalesOrderModel> get salesOrders => _salesOrders;
  bool get isLoadingSales => _isLoadingSales;
  String? get salesError => _salesError;

  // Load Pembelian (Penerimaan Barang)
  Future<void> loadPurchases({String? status}) async {
    _isLoadingPurchases = true;
    _purchaseError = null;
    notifyListeners();

    try {
      _purchases = await WarehouseService.getPurchasesForReceipt(status: status);
      _isLoadingPurchases = false;
    } catch (e) {
      _isLoadingPurchases = false;
      _purchaseError = e.toString().replaceAll('Exception: ', '');
    }
    notifyListeners();
  }

  // Load Penjualan (Pengiriman Barang)
  Future<void> loadSalesOrders({String? processStatus}) async {
    _isLoadingSales = true;
    _salesError = null;
    notifyListeners();

    try {
      _salesOrders = await WarehouseService.getSalesForShipment(
        processStatus: processStatus,
      );
      _isLoadingSales = false;
    } catch (e) {
      _isLoadingSales = false;
      _salesError = e.toString().replaceAll('Exception: ', '');
    }
    notifyListeners();
  }

  // Submit Penerimaan Barang Gudang
  Future<bool> receivePurchaseGoods({
    required String purchaseId,
    String? pbfDeliveryOrderNo,
    String? pbfInvoiceNo,
    String? taxInvoiceNo,
    required List<Map<String, dynamic>> items,
    String? notes,
  }) async {
    try {
      await WarehouseService.receivePurchaseGoods(
        purchaseId: purchaseId,
        pbfDeliveryOrderNo: pbfDeliveryOrderNo,
        pbfInvoiceNo: pbfInvoiceNo,
        taxInvoiceNo: taxInvoiceNo,
        items: items,
        notes: notes,
      );
      await loadPurchases();
      return true;
    } catch (e) {
      _purchaseError = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  // Submit Pengiriman Barang Penjualan
  Future<bool> shipSalesOrder({
    required String orderId,
    required String deliveryOrderNo,
    required String shippingDate,
    String? courierName,
    String? trackingNumber,
    String? notes,
    required List<Map<String, dynamic>> items,
  }) async {
    try {
      await WarehouseService.shipSalesOrder(
        orderId: orderId,
        deliveryOrderNo: deliveryOrderNo,
        shippingDate: shippingDate,
        courierName: courierName,
        trackingNumber: trackingNumber,
        notes: notes,
        items: items,
      );
      await loadSalesOrders();
      return true;
    } catch (e) {
      _salesError = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }
}
