import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../services/product_service.dart';

class CatalogProvider with ChangeNotifier {
  List<ProductModel> _products = [];
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _searchQuery = '';
  String? _selectedCategoryId;

  List<ProductModel> get products => _products;
  List<Map<String, dynamic>> get categories => _categories;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get searchQuery => _searchQuery;
  String? get selectedCategoryId => _selectedCategoryId;

  Future<void> loadCatalog() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final prodsFuture = ProductService.getProducts(
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        categoryId: _selectedCategoryId,
      );
      final catsFuture = ProductService.getCategories();

      final results = await Future.wait([prodsFuture, catsFuture]);
      _products = results[0] as List<ProductModel>;
      _categories = results[1] as List<Map<String, dynamic>>;
      _isLoading = false;
    } catch (e, stack) {
      debugPrint("Error loading catalog: $e\n$stack");
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    }
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    loadCatalog();
  }

  void selectCategory(String? categoryId) {
    if (_selectedCategoryId == categoryId) {
      _selectedCategoryId = null;
    } else {
      _selectedCategoryId = categoryId;
    }
    loadCatalog();
  }
}
