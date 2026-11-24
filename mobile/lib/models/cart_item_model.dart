import 'product_model.dart';

class CartItemModel {
  final ProductModel product;
  double quantity;
  double discountPercent;

  CartItemModel({
    required this.product,
    this.quantity = 1.0,
    this.discountPercent = 0.0,
  });

  double get unitPrice => product.sellingPrice;

  double get subtotal => quantity * unitPrice;

  double get discountAmount => subtotal * (discountPercent / 100);

  double get total => subtotal - discountAmount;

  Map<String, dynamic> toOrderItemJson() {
    return {
      'product_id': product.id,
      'unit_id': product.unitId,
      'qty': quantity,
      'unit_price': unitPrice,
      'discount': discountPercent,
    };
  }
}
