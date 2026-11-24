class PurchaseItemModel {
  final String id;
  final String productId;
  final String productCode;
  final String productName;
  final String unitName;
  final double qty; // Qty Pesanan / Qty Faktur
  double receivedQty; // Qty Fisik Diterima Gudang
  String batchNumber;
  String expiredDate;
  final double unitPrice;
  final double lineTotal;

  PurchaseItemModel({
    required this.id,
    required this.productId,
    required this.productCode,
    required this.productName,
    required this.unitName,
    required this.qty,
    required this.receivedQty,
    this.batchNumber = '',
    this.expiredDate = '',
    required this.unitPrice,
    required this.lineTotal,
  });

  factory PurchaseItemModel.fromJson(Map<String, dynamic> json) {
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

    double q = (json['qty'] as num?)?.toDouble() ?? 0.0;
    double rq = (json['received_qty'] as num?)?.toDouble() ?? q;

    return PurchaseItemModel(
      id: json['id'] ?? '',
      productId: json['product_id'] ?? '',
      productCode: pCode,
      productName: pName,
      unitName: uName,
      qty: q,
      receivedQty: rq,
      batchNumber: json['batch_number'] ?? '',
      expiredDate: json['expired_date'] ?? '',
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      lineTotal: (json['total_amount'] as num?)?.toDouble() ??
          (json['line_total'] as num?)?.toDouble() ??
          0.0,
    );
  }
}

class PurchaseModel {
  final String id;
  final String invoiceNo;
  final String? purchaseOrderId;
  final String? poOrderNo;
  final String date;
  final String supplierName;
  final String supplierCode;
  final String warehouseId;
  final String warehouseName;
  final double totalAmount;
  final double paidAmount;
  final double remainingAmount;
  final String status;
  final String verificationStatus; // MENUNGGU_PENERIMAAN, VERIFIKASI_GUDANG, APPROVED, REJECTED
  final bool isVerified;
  final String? pbfInvoiceNo;
  final String? pbfDeliveryOrderNo;
  final String? taxInvoiceNo;
  final String? notes;
  final String? warehouseVerifiedAt;
  final String? warehouseVerifierName;
  final List<PurchaseItemModel> items;

  PurchaseModel({
    required this.id,
    required this.invoiceNo,
    this.purchaseOrderId,
    this.poOrderNo,
    required this.date,
    required this.supplierName,
    required this.supplierCode,
    required this.warehouseId,
    required this.warehouseName,
    required this.totalAmount,
    this.paidAmount = 0.0,
    required this.remainingAmount,
    required this.status,
    required this.verificationStatus,
    required this.isVerified,
    this.pbfInvoiceNo,
    this.pbfDeliveryOrderNo,
    this.taxInvoiceNo,
    this.notes,
    this.warehouseVerifiedAt,
    this.warehouseVerifierName,
    required this.items,
  });

  bool get isWaitingReceipt =>
      verificationStatus == 'MENUNGGU_PENERIMAAN' ||
      verificationStatus == 'REJECTED';

  bool get isVerifiedByWarehouse =>
      verificationStatus == 'VERIFIKASI_GUDANG';

  bool get isApprovedByAdmin =>
      verificationStatus == 'APPROVED' || isVerified;

  factory PurchaseModel.fromJson(Map<String, dynamic> json) {
    String sName = json['supplier_name'] ?? '-';
    String sCode = json['supplier_code'] ?? '-';
    if (json['supplier'] is Map) {
      sName = json['supplier']['name'] ?? sName;
      sCode = json['supplier']['code'] ?? sCode;
    }

    String wName = json['warehouse_name'] ?? 'Gudang Utama Farmasi';
    if (json['warehouse'] is Map) {
      wName = json['warehouse']['name'] ?? wName;
    }

    String? poNo;
    if (json['purchase_order'] is Map) {
      poNo = json['purchase_order']['order_no'];
    }

    String? wvName;
    if (json['warehouse_verifier'] is Map) {
      wvName = json['warehouse_verifier']['full_name'] ??
          json['warehouse_verifier']['username'];
    }

    var itemsList = <PurchaseItemModel>[];
    if (json['items'] is List) {
      itemsList = (json['items'] as List)
          .map((i) => PurchaseItemModel.fromJson(i))
          .toList();
    }

    return PurchaseModel(
      id: json['id'] ?? '',
      invoiceNo: json['invoice_no'] ?? '',
      purchaseOrderId: json['purchase_order_id'],
      poOrderNo: poNo,
      date: json['date'] ?? json['created_at'] ?? '',
      supplierName: sName,
      supplierCode: sCode,
      warehouseId: json['warehouse_id'] ?? '',
      warehouseName: wName,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paid_amount'] as num?)?.toDouble() ?? 0.0,
      remainingAmount: (json['remaining_amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'DRAFT',
      verificationStatus: json['verification_status'] ?? 'MENUNGGU_PENERIMAAN',
      isVerified: json['is_verified'] ?? false,
      pbfInvoiceNo: json['pbf_invoice_no'],
      pbfDeliveryOrderNo: json['pbf_delivery_order_no'],
      taxInvoiceNo: json['tax_invoice_no'],
      notes: json['notes'],
      warehouseVerifiedAt: json['warehouse_verified_at'],
      warehouseVerifierName: wvName,
      items: itemsList,
    );
  }
}
