package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

type ReportHandler struct{}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// ExportSalesReportExcel exports sales transaction report to Excel
func (h *ReportHandler) ExportSalesReportExcel(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	var sales []models.Sale
	database.DB.Where("company_id = ?", companyID).
		Preload("Customer").Preload("User").
		Order("date DESC").Find(&sales)

	f := excelize.NewFile()
	sheet := "Laporan Penjualan"
	f.SetSheetName("Sheet1", sheet)

	// Headers
	headers := []string{"No Faktur", "Tanggal", "Tipe", "Pelanggan", "Status Bayar", "Subtotal (IDR)", "Pajak (IDR)", "Diskon (IDR)", "Total (IDR)", "Terbayar (IDR)", "Sisa Piutang (IDR)"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	for rowIdx, s := range sales {
		custName := "Umum"
		if s.Customer != nil {
			custName = s.Customer.Name
		}
		row := rowIdx + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), s.InvoiceNo)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), s.Date.Format("2006-01-02 15:04"))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), s.Type)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), custName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), s.PaymentStatus)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), s.Subtotal)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), s.TaxAmount)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), s.Discount)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), s.TotalAmount)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), s.PaidAmount)
		f.SetCellValue(sheet, fmt.Sprintf("K%d", row), s.RemainingAmount)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat berkas Excel", err.Error())
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=laporan-penjualan-%s.xlsx", time.Now().Format("20060102150405")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// ExportInventoryReportExcel exports stock balance report to Excel
func (h *ReportHandler) ExportInventoryReportExcel(c *gin.Context) {
	var balances []models.StockBalance
	database.DB.Preload("Product.BaseUnit").Preload("Product.Category").Preload("Warehouse").Find(&balances)

	f := excelize.NewFile()
	sheet := "Laporan Persediaan"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"Gudang", "Kode Produk", "Barcode", "Nama Obat / Produk", "Kategori", "Satuan", "Kuantitas", "Harga Pokok Rata2 (IDR)", "Total Nilai Persediaan (IDR)"}
	for i, head := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, head)
	}

	for rowIdx, b := range balances {
		whName := "-"
		if b.Warehouse != nil {
			whName = b.Warehouse.Name
		}
		prodCode, prodBarcode, prodName, catName, unitName := "-", "-", "-", "-", "-"
		if b.Product != nil {
			prodCode = b.Product.Code
			prodBarcode = b.Product.Barcode
			prodName = b.Product.Name
			if b.Product.Category != nil {
				catName = b.Product.Category.Name
			}
			if b.Product.BaseUnit != nil {
				unitName = b.Product.BaseUnit.Name
			}
		}

		totalVal := b.Qty * b.AvgCost
		row := rowIdx + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), whName)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), prodCode)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), prodBarcode)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), prodName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), catName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), unitName)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), b.Qty)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), b.AvgCost)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), totalVal)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat berkas Excel", err.Error())
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=laporan-persediaan-%s.xlsx", time.Now().Format("20060102150405")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// ExportInvoicePDF generates an A4 PDF invoice for a sale
func (h *ReportHandler) ExportInvoicePDF(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID faktur tidak valid", err.Error())
		return
	}

	var sale models.Sale
	if err := database.DB.Preload("Customer").Preload("Company").Preload("Branch").
		Preload("Items.Product").Preload("Items.Unit").Preload("Payments").First(&sale, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", err.Error())
		return
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(190, 10, "FAKTUR PENJUALAN APOTEK")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(100, 6, fmt.Sprintf("No Faktur: %s", sale.InvoiceNo))
	pdf.Cell(90, 6, fmt.Sprintf("Tanggal: %s", sale.Date.Format("02 Jan 2006 15:04")))
	pdf.Ln(6)

	custName := "Pelanggan Umum"
	if sale.Customer != nil {
		custName = sale.Customer.Name
	}
	pdf.Cell(100, 6, fmt.Sprintf("Pelanggan: %s", custName))
	pdf.Cell(90, 6, fmt.Sprintf("Status: %s / %s", sale.Status, sale.PaymentStatus))
	pdf.Ln(10)

	// Table Header
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(15, 8, "No", "1", 0, "C", false, 0, "")
	pdf.CellFormat(85, 8, "Nama Barang / Obat", "1", 0, "L", false, 0, "")
	pdf.CellFormat(25, 8, "Qty", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 8, "Harga (IDR)", "1", 0, "R", false, 0, "")
	pdf.CellFormat(35, 8, "Total (IDR)", "1", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	for i, item := range sale.Items {
		pName := "-"
		if item.Product != nil {
			pName = item.Product.Name
		}
		pdf.CellFormat(15, 7, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(85, 7, pName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.0f", item.Qty), "1", 0, "C", false, 0, "")
		pdf.CellFormat(30, 7, fmt.Sprintf("%.2f", item.UnitPrice), "1", 0, "R", false, 0, "")
		pdf.CellFormat(35, 7, fmt.Sprintf("%.2f", item.TotalAmount), "1", 1, "R", false, 0, "")
	}

	pdf.Ln(5)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(155, 7, "Total Tagihan:", "0", 0, "R", false, 0, "")
	pdf.CellFormat(35, 7, fmt.Sprintf("Rp %.2f", sale.TotalAmount), "1", 1, "R", false, 0, "")

	pdf.CellFormat(155, 7, "Jumlah Terbayar:", "0", 0, "R", false, 0, "")
	pdf.CellFormat(35, 7, fmt.Sprintf("Rp %.2f", sale.PaidAmount), "1", 1, "R", false, 0, "")

	if sale.ChangeAmount > 0 {
		pdf.CellFormat(155, 7, "Kembalian:", "0", 0, "R", false, 0, "")
		pdf.CellFormat(35, 7, fmt.Sprintf("Rp %.2f", sale.ChangeAmount), "1", 1, "R", false, 0, "")
	} else if sale.RemainingAmount > 0 {
		pdf.CellFormat(155, 7, "Sisa Piutang:", "0", 0, "R", false, 0, "")
		pdf.CellFormat(35, 7, fmt.Sprintf("Rp %.2f", sale.RemainingAmount), "1", 1, "R", false, 0, "")
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mencetak PDF faktur", err.Error())
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=faktur-%s.pdf", sale.InvoiceNo))
	c.Data(http.StatusOK, "application/pdf", buf.Bytes())
}
