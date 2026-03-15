package com.schoolos.payment;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class ReceiptPdfService {

    @Value("${app.upload-dir:/uploads}")
    private String uploadDir;

    public String generate(PaymentDto payment, String lang) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            // Title
            doc.add(new Paragraph(getLabel("receipt.title", lang))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBold()
                    .setFontSize(18));

            doc.add(new Paragraph("\n"));

            // Receipt Info
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
            headerTable.setWidth(UnitValue.createPercentValue(100));
            headerTable.addCell(new Cell().add(new Paragraph(
                    getLabel("receipt.number", lang) + ": " + payment.receiptNumber())).setBorder(null));
            headerTable.addCell(new Cell().add(new Paragraph(
                    getLabel("receipt.date", lang) + ": " + payment.paymentDate()))
                    .setTextAlignment(TextAlignment.RIGHT).setBorder(null));
            doc.add(headerTable);

            doc.add(new Paragraph("\n"));

            // Payment Details
            Table detailsTable = new Table(UnitValue.createPercentArray(new float[]{40, 60}));
            detailsTable.setWidth(UnitValue.createPercentValue(100));

            addRow(detailsTable, getLabel("receipt.amount", lang), payment.amount().toString());
            addRow(detailsTable, getLabel("receipt.mode", lang), payment.paymentMode());
            addRow(detailsTable, getLabel("receipt.status", lang), payment.status());

            if (payment.upiTransactionId() != null) {
                addRow(detailsTable, getLabel("receipt.txnId", lang), payment.upiTransactionId());
            }

            doc.add(detailsTable);

            doc.close();

            // Save to file
            Path dir = Paths.get(uploadDir, "receipts");
            Files.createDirectories(dir);
            String filename = "receipt-" + payment.id() + "-" + lang + ".pdf";
            Path dest = dir.resolve(filename);
            Files.write(dest, baos.toByteArray());

            return "/uploads/receipts/" + filename;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate receipt PDF", e);
        }
    }

    private void addRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setBold()));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "")));
    }

    private String getLabel(String key, String lang) {
        return switch (key) {
            case "receipt.title" -> switch (lang) {
                case "hi" -> "शुल्क रसीद";
                case "gu" -> "ફી રસીદ";
                default -> "Fee Receipt";
            };
            case "receipt.number" -> switch (lang) {
                case "hi" -> "रसीद क्रमांक";
                case "gu" -> "રસીદ ક્રમ";
                default -> "Receipt No.";
            };
            case "receipt.date" -> switch (lang) {
                case "hi" -> "दिनांक";
                case "gu" -> "તારીખ";
                default -> "Date";
            };
            case "receipt.amount" -> switch (lang) {
                case "hi" -> "राशि";
                case "gu" -> "રકમ";
                default -> "Amount";
            };
            case "receipt.mode" -> switch (lang) {
                case "hi" -> "भुगतान विधि";
                case "gu" -> "ચૂકવણી પ્રકાર";
                default -> "Payment Mode";
            };
            case "receipt.status" -> switch (lang) {
                case "hi" -> "स्थिति";
                case "gu" -> "સ્થિતિ";
                default -> "Status";
            };
            case "receipt.txnId" -> switch (lang) {
                case "hi" -> "UPI लेनदेन आईडी";
                case "gu" -> "UPI ટ્રાન્ઝેક્શન ID";
                default -> "UPI Transaction ID";
            };
            default -> key;
        };
    }
}
