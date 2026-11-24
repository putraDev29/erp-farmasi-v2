import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../models/product_model.dart';
import 'api_client.dart';

class ProductService {
  static Future<List<ProductModel>> getProducts({
    String? search,
    String? categoryId,
  }) async {
    final queryParams = <String, String>{
      'page_size': '100',
      'limit': '100',
    };
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    if (categoryId != null && categoryId.isNotEmpty) {
      queryParams['category_id'] = categoryId;
    }

    final uri = Uri.parse(ApiConfig.products).replace(queryParameters: queryParams);
    final res = await ApiClient.get(uri.toString());

    List<dynamic> list = [];
    if (res is Map) {
      final d = res['data'];
      if (d is Map && d['items'] is Iterable) {
        list = (d['items'] as Iterable).toList();
      } else if (d is Iterable) {
        list = d.toList();
      } else if (res['items'] is Iterable) {
        list = (res['items'] as Iterable).toList();
      }
    } else if (res is Iterable) {
      list = res.toList();
    }

    final List<ProductModel> items = [];
    for (final item in list) {
      if (item is Map) {
        try {
          items.add(ProductModel.fromJson(Map<String, dynamic>.from(item)));
        } catch (e) {
          debugPrint("Failed to parse product: $e");
        }
      }
    }
    return items;
  }

  static Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final res = await ApiClient.get(ApiConfig.categories);
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
      return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (e) {
      debugPrint("Error fetching categories: $e");
      return [];
    }
  }
}
