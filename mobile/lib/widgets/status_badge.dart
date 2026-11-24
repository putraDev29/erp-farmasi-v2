import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final String? label;
  final double? fontSize;

  const StatusBadge({
    super.key,
    required this.status,
    this.label,
    this.fontSize,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;
    Color border;
    String display = label ?? status;

    final s = status.toUpperCase();
    if (s == 'APPROVED' || s == 'SELESAI' || s == 'COMPLETED' || s == 'PAID' || s == 'LUNAS' || s == 'DISETUJUI') {
      bg = const Color(0xFFDCFCE7); // Emerald 100
      text = const Color(0xFF15803D); // Emerald 700
      border = const Color(0xFF86EFAC);
    } else if (s == 'VERIFIKASI_GUDANG' || s == 'SHIPPED' || s == 'DIKIRIM') {
      bg = const Color(0xFFE0F2FE); // Sky 100
      text = const Color(0xFF0369A1); // Sky 700
      border = const Color(0xFF7DD3FC);
    } else if (s == 'MENUNGGU_PENERIMAAN' || s == 'PENDING' || s == 'DIPROSES' || s == 'MENUNGGU VERIFIKASI') {
      bg = const Color(0xFFFEF3C7); // Amber 100
      text = const Color(0xFFB45309); // Amber 700
      border = const Color(0xFFFCD34D);
    } else if (s == 'REJECTED' || s == 'DITOLAK' || s == 'CANCELLED' || s == 'BATAL') {
      bg = const Color(0xFFFFE4E6); // Rose 100
      text = const Color(0xFFBE123C); // Rose 700
      border = const Color(0xFFFDA4AF);
    } else {
      bg = const Color(0xFFF1F5F9); // Slate 100
      text = const Color(0xFF475569); // Slate 600
      border = const Color(0xFFCBD5E1);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: border, width: 0.8),
      ),
      child: Text(
        display,
        style: TextStyle(
          fontSize: fontSize ?? 10,
          fontWeight: FontWeight.bold,
          color: text,
        ),
      ),
    );
  }
}
