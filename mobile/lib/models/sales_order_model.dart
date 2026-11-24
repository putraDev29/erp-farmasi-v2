import 'customer_model.dart';

class SalesOrderItemModel {
  final String id;
  final String productId;
  final String productCode;
  final String productName;
  final String unitName;
  final double qty;
  final double shippedQty;
  final double unitPrice;
  final double discountPercent;
  final double lineTotal;
  final String? batchNumber;
  final String? expiredDate;

  SalesOrderItemModel({
    required this.id,
    required this.productId,
    required this.productCode,
    required this.productName,
    required this.unitName,
    required this.qty,
    this.shippedQty = 0.0,
    required this.unitPrice,
    this.discountPercent = 0.0,
    required this.lineTotal,
    this.batchNumber,
    this.expiredDate,
  });

  factory SalesOrderItemModel.fromJson(Map<String, dynamic> json) {
    String pCode = json['product_code'] ?? '';
    String pName = json['product_name'] ?? '';
    if (json['product'] is Map) {
      pCode = json['product']['code'] ?? pCode;
      pName = json['product']['name'] ?? pName;
    }

    String uName = json['unit_name'] ?? 'Pcs';
    if (json['unit'] is Map) {
      uName = json['unit']['name'] ?? uName;
    }

    return SalesOrderItemModel(
      id: json['id'] ?? '',
      productId: json['product_id'] ?? '',
      productCode: pCode,
      productName: pName,
      unitName: uName,
      qty: (json['qty'] as num?)?.toDouble() ?? 0.0,
      shippedQty: (json['shipped_qty'] as num?)?.toDouble() ?? 0.0,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      discountPercent: (json['discount'] as num?)?.toDouble() ?? 0.0,
      lineTotal: (json['line_total'] as num?)?.toDouble() ??
          (json['subtotal'] as num?)?.toDouble() ??
          0.0,
      batchNumber: json['batch_number'],
      expiredDate: json['expired_date'],
    );
  }
}

class SalesOrderModel {
  final String id;
  final String orderNo;
  final String date;
  final String? customerId;
  final CustomerModel? customer;
  final String customerName;
  final String warehouseId;
  final String warehouseName;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final String status; // PENDING, CONFIRMED, PROCESSING, SHIPPED, COMPLETED, CANCELLED
  final String processStatus; // Diproses, Dikirim, Selesai
  final String paymentStatus; // UNPAID, PARTIAL, PAID
  final String source; // MARKETPLACE, BACKOFFICE, POS
  final String? customerSpNumber;
  final String? customerSpDate;
  final String? deliveryOrderNo;
  final String? shippingDate;
  final String? receivedDate;
  final String? receivedBy;
  final String? receivedNotes;
  final String? notes;
  final List<SalesOrderItemModel> items;

  SalesOrderModel({
    required this.id,
    required this.orderNo,
    required this.date,
    this.customerId,
    this.customer,
    required this.customerName,
    required this.warehouseId,
    required this.warehouseName,
    required this.totalAmount,
    this.paidAmount = 0.0,
    required this.remainingAmount,
    required this.status,
    required this.processStatus,
    required this.paymentStatus,
    required this.source,
    this.customerSpNumber,
    this.customerSpDate,
    this.deliveryOrderNo,
    this.shippingDate,
    this.receivedDate,
    this.receivedBy,
    this.receivedNotes,
    this.notes,
    required this.items,
  });

  bool get isApproved =>
      status == 'CONFIRMED' ||
      status == 'APPROVED' ||
      status == 'DIPROSES' ||
      processStatus.toLowerCase().contains('setuju') ||
      processStatus.toLowerCase().contains('proses');

  bool get isShipped =>
      status == 'SHIPPED' ||
      status == 'DIKIRIM' ||
      processStatus.toLowerCase().contains('kirim');

  bool get isReceived =>
      status == 'COMPLETED' ||
      status == 'SELESAI' ||
      status == 'DITERIMA' ||
      processStatus.toLowerCase().contains('selesai') ||
      processStatus.toLowerCase().contains('terima');

  factory SalesOrderModel.fromJson(Map<String, dynamic> json) {
    String cName = json['customer_name'] ?? '';
    CustomerModel? cust;
    if (json['customer'] is Map) {
      cust = CustomerModel.fromJson(json['customer']);
      cName = cust.name;
    }

    String wName = json['warehouse_name'] ?? 'Gudang Utama Farmasi';
    if (json['warehouse'] is Map) {
      wName = json['warehouse']['name'] ?? wName;
    }

    var itemsList = <SalesOrderItemModel>[];
    if (json['items'] is List) {
      itemsList = (json['items'] as List)
          .map((i) => SalesOrderItemModel.fromJson(i))
          .toList();
    }

    return SalesOrderModel(
      id: json['id'] ?? '',
      orderNo: json['order_no'] ?? json['invoice_no'] ?? '',
      date: json['date'] ?? json['created_at'] ?? '',
      customerId: json['customer_id'],
      customer: cust,
      customerName: cName,
      warehouseId: json['warehouse_id'] ?? '',
      warehouseName: wName,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paid_amount'] as num?)?.toDouble() ?? 0.0,
      remainingAmount: (json['remaining_amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'PENDING',
      processStatus: json['process_status'] ?? 'Diproses',
      paymentStatus: json['payment_status'] ?? 'UNPAID',
      source: json['source'] ?? json['type'] ?? 'MARKETPLACE',
      customerSpNumber: json['customer_sp_number'],
      customerSpDate: json['customer_sp_date'],
      deliveryOrderNo: json['delivery_order_no'],
      shippingDate: json['shipping_date'],
      receivedDate: json['received_date'],
      receivedBy: json['received_by'],
      receivedNotes: json['received_notes'],
      notes: json['notes'],
      items: itemsList,
    );
  }
}
