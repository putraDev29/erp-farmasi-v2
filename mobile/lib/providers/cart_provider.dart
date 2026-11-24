import 'package:flutter/material.dart';
import '../models/cart_item_model.dart';
import '../models/product_model.dart';

class CartProvider with ChangeNotifier {
  final Map<String, CartItemModel> _items = {};

  Map<String, CartItemModel> get items => {..._items};

  int get itemCount => _items.length;

  double get totalQuantity =>
      _items.values.fold(0.0, (sum, item) => sum + item.quantity);

  double get subtotal =>
      _items.values.fold(0.0, (sum, item) => sum + item.subtotal);

  double get totalDiscount =>
      _items.values.fold(0.0, (sum, item) => sum + item.discountAmount);

  double get grandTotal =>
      _items.values.fold(0.0, (sum, item) => sum + item.total);

  bool isInCart(String productId) => _items.containsKey(productId);

  double getProductQuantity(String productId) {
    return _items[productId]?.quantity ?? 0.0;
  }

  void addItem(ProductModel product, {double qty = 1.0}) {
    if (_items.containsKey(product.id)) {
      _items[product.id]!.quantity += qty;
    } else {
      _items[product.id] = CartItemModel(
        product: product,
        quantity: qty,
      );
    }
    notifyListeners();
  }

  void updateQuantity(String productId, double quantity) {
    if (!_items.containsKey(productId)) return;
    if (quantity <= 0) {
      _items.remove(productId);
    } else {
      _items[productId]!.quantity = quantity;
    }
    notifyListeners();
  }

  void removeItem(String productId) {
    _items.remove(productId);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
