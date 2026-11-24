class ProductModel {
  final String id;
  final String code;
  final String name;
  final String? barcode;
  final String? sku;
  final String? brandName;
  final String? categoryName;
  final String? unitId;
  final String unitName;
  final double sellingPrice;
  final double purchasePrice;
  final double physicalStock;
  final String? rackLocation;
  final String? description;
  final bool isPrescriptionRequired;

  ProductModel({
    required this.id,
    required this.code,
    required this.name,
    this.barcode,
    this.sku,
    this.brandName,
    this.categoryName,
    this.unitId,
    required this.unitName,
    required this.sellingPrice,
    this.purchasePrice = 0.0,
    required this.physicalStock,
    this.rackLocation,
    this.description,
    this.isPrescriptionRequired = false,
  });

  bool get isAvailable => physicalStock > 0;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    // Resolve Unit Name
    String uName = 'Pcs';
    if (json['base_unit'] is Map && json['base_unit']['name'] != null) {
      uName = json['base_unit']['name'];
    } else if (json['unit'] is Map && json['unit']['name'] != null) {
      uName = json['unit']['name'];
    } else if (json['unit_name'] != null) {
      uName = json['unit_name'];
    }

    // Resolve Brand Name
    String? bName;
    if (json['brand'] is Map && json['brand']['name'] != null) {
      bName = json['brand']['name'];
    } else if (json['brand_name'] != null) {
      bName = json['brand_name'];
    }

    // Resolve Category Name
    String? cName;
    if (json['category'] is Map && json['category']['name'] != null) {
      cName = json['category']['name'];
    } else if (json['category_name'] != null) {
      cName = json['category_name'];
    }

    // Resolve Physical Stock
    double stock = 0.0;
    if (json['stock'] != null) {
      stock = (num.tryParse(json['stock'].toString()) ?? 0).toDouble();
    } else if (json['physical_stock'] != null) {
      stock = (num.tryParse(json['physical_stock'].toString()) ?? 0).toDouble();
    } else if (json['stock_physical'] != null) {
      stock = (num.tryParse(json['stock_physical'].toString()) ?? 0).toDouble();
    } else if (json['current_stock'] != null) {
      stock = (num.tryParse(json['current_stock'].toString()) ?? 0).toDouble();
    } else if (json['total_stock'] != null) {
      stock = (num.tryParse(json['total_stock'].toString()) ?? 0).toDouble();
    }

    return ProductModel(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      barcode: json['barcode']?.toString(),
      sku: json['sku']?.toString(),
      brandName: bName,
      categoryName: cName,
      unitId: json['unit_id']?.toString(),
      unitName: uName,
      sellingPrice: (num.tryParse(json['selling_price']?.toString() ?? '') ??
              num.tryParse(json['price']?.toString() ?? '') ??
              0.0)
          .toDouble(),
      purchasePrice: (num.tryParse(json['purchase_price']?.toString() ?? '') ??
              num.tryParse(json['unit_cost']?.toString() ?? '') ??
              0.0)
          .toDouble(),
      physicalStock: stock,
      rackLocation: json['rack_location']?.toString() ?? json['rack']?.toString(),
      description: json['description']?.toString(),
      isPrescriptionRequired: json['is_prescription_required'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'barcode': barcode,
      'sku': sku,
      'brand_name': brandName,
      'category_name': categoryName,
      'unit_id': unitId,
      'unit_name': unitName,
      'selling_price': sellingPrice,
      'purchase_price': purchasePrice,
      'physical_stock': physicalStock,
      'rack_location': rackLocation,
      'description': description,
      'is_prescription_required': isPrescriptionRequired,
    };
  }
}
