package com.schoolos.slc;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
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
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class SlcPdfService {

    @Value("${app.upload-dir:/uploads}")
    private String uploadDir;

    public String generate(SlcDto slc, String lang) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            // Try to load Noto Sans font for multilingual support
            PdfFont font = loadFont(lang);
            doc.setFont(font);

            // Title
            doc.add(new Paragraph(getLabel("slc.title", lang))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBold()
                    .setFontSize(18));

            doc.add(new Paragraph(getLabel("slc.subtitle", lang))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12));

            doc.add(new Paragraph("\n"));

            // SLC Number and Date
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
            headerTable.setWidth(UnitValue.createPercentValue(100));
            headerTable.addCell(new Cell().add(new Paragraph(getLabel("slc.number", lang) + ": " + slc.slcNumber())).setBorder(null));
            headerTable.addCell(new Cell().add(new Paragraph(getLabel("slc.date", lang) + ": " + slc.issuedAt().toLocalDate()))
                    .setTextAlignment(TextAlignment.RIGHT).setBorder(null));
            doc.add(headerTable);

            doc.add(new Paragraph("\n"));

            // Details table
            Table detailsTable = new Table(UnitValue.createPercentArray(new float[]{40, 60}));
            detailsTable.setWidth(UnitValue.createPercentValue(100));

            addRow(detailsTable, getLabel("slc.grNumber", lang), slc.grNumber());
            addRow(detailsTable, getLabel("slc.dateOfLeaving", lang), slc.dateOfLeaving() != null ? slc.dateOfLeaving().toString() : "");
            addRow(detailsTable, getLabel("slc.reason", lang), slc.reason() + (slc.reasonDetail() != null ? " - " + slc.reasonDetail() : ""));
            addRow(detailsTable, getLabel("slc.lastGrade", lang), String.valueOf(slc.lastGradeAttended()));
            addRow(detailsTable, getLabel("slc.lastExam", lang), slc.lastExamPassed() != null ? slc.lastExamPassed() : "");
            addRow(detailsTable, getLabel("slc.conduct", lang), slc.characterConduct());
            if (slc.generalRemarks() != null) {
                addRow(detailsTable, getLabel("slc.remarks", lang), slc.generalRemarks());
            }

            doc.add(detailsTable);

            doc.add(new Paragraph("\n\n"));

            // Signature area
            Table sigTable = new Table(UnitValue.createPercentArray(new float[]{33, 33, 33}));
            sigTable.setWidth(UnitValue.createPercentValue(100));
            sigTable.addCell(new Cell().add(new Paragraph(getLabel("slc.sig.student", lang))).setBorder(null).setTextAlignment(TextAlignment.CENTER));
            sigTable.addCell(new Cell().add(new Paragraph(getLabel("slc.sig.guardian", lang))).setBorder(null).setTextAlignment(TextAlignment.CENTER));
            sigTable.addCell(new Cell().add(new Paragraph(getLabel("slc.sig.principal", lang))).setBorder(null).setTextAlignment(TextAlignment.CENTER));
            doc.add(sigTable);

            doc.close();

            // Save to file
            Path dir = Paths.get(uploadDir, "slc");
            Files.createDirectories(dir);
            String filename = "slc-" + slc.id() + "-" + lang + ".pdf";
            Path dest = dir.resolve(filename);
            Files.write(dest, baos.toByteArray());

            return "/uploads/slc/" + filename;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate SLC PDF", e);
        }
    }

    private PdfFont loadFont(String lang) {
        try {
            String fontResource;
            if ("hi".equals(lang)) {
                fontResource = "/fonts/NotoSansDevanagari-Regular.ttf";
            } else if ("gu".equals(lang)) {
                fontResource = "/fonts/NotoSansGujarati-Regular.ttf";
            } else {
                fontResource = "/fonts/NotoSans-Regular.ttf";
            }
            InputStream is = getClass().getResourceAsStream(fontResource);
            if (is != null) {
                return PdfFontFactory.createFont(is.readAllBytes(), PdfEncodings.IDENTITY_H);
            }
            // Fallback to Helvetica
            return PdfFontFactory.createFont();
        } catch (Exception e) {
            try {
                return PdfFontFactory.createFont();
            } catch (Exception ex) {
                throw new RuntimeException("Cannot load font", ex);
            }
        }
    }

    private void addRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setBold()));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "")));
    }

    private String getLabel(String key, String lang) {
        return switch (key) {
            case "slc.title" -> switch (lang) {
                case "hi" -> "विद्यालय छोड़ने का प्रमाण पत्र";
                case "gu" -> "શાળા છોડ્યાનું પ્રમાણપત્ર";
                default -> "School Leaving Certificate";
            };
            case "slc.subtitle" -> switch (lang) {
                case "hi" -> "स्थानांतरण प्रमाण पत्र";
                case "gu" -> "ટ્રાન્સફર સર્ટિફિકેટ";
                default -> "Transfer Certificate";
            };
            case "slc.number" -> switch (lang) {
                case "hi" -> "प्रमाण पत्र क्रमांक";
                case "gu" -> "પ્રમાણ પ્ત્ર ક્રમ";
                default -> "SLC No.";
            };
            case "slc.date" -> switch (lang) {
                case "hi" -> "दिनांक";
                case "gu" -> "તારીખ";
                default -> "Date";
            };
            case "slc.grNumber" -> switch (lang) {
                case "hi" -> "जीआर क्रमांक";
                case "gu" -> "GR ક્રમ";
                default -> "GR Number";
            };
            case "slc.dateOfLeaving" -> switch (lang) {
                case "hi" -> "छोड़ने की तारीख";
                case "gu" -> "છોડ્યાની તારીખ";
                default -> "Date of Leaving";
            };
            case "slc.reason" -> switch (lang) {
                case "hi" -> "कारण";
                case "gu" -> "કારણ";
                default -> "Reason";
            };
            case "slc.lastGrade" -> switch (lang) {
                case "hi" -> "अंतिम कक्षा";
                case "gu" -> "છેલ્લો ધોરણ";
                default -> "Last Grade";
            };
            case "slc.lastExam" -> switch (lang) {
                case "hi" -> "उत्तीर्ण परीक्षा";
                case "gu" -> "પાસ થયેલ પ્રીક્ષા";
                default -> "Last Exam Passed";
            };
            case "slc.conduct" -> switch (lang) {
                case "hi" -> "चरित्र एवं आचरण";
                case "gu" -> "ચારિત્ર્ય અને આચરણ";
                default -> "Character & Conduct";
            };
            case "slc.remarks" -> switch (lang) {
                case "hi" -> "टिप्पणी";
                case "gu" -> "ટિપ્પણ";
                default -> "Remarks";
            };
            case "slc.sig.student" -> switch (lang) {
                case "hi" -> "विद्यार्थी के हस्ताक्षर";
                case "gu" -> "વિદ્યાર્થીની સહી";
                default -> "Student's Signature";
            };
            case "slc.sig.guardian" -> switch (lang) {
                case "hi" -> "अभिभावक के हस्ताक्षर";
                case "gu" -> "વાલીની સહી";
                default -> "Guardian's Signature";
            };
            case "slc.sig.principal" -> switch (lang) {
                case "hi" -> "प्राचार्य के हस्ताक्षर";
                case "gu" -> "આચાર્યની સહી";
                default -> "Principal's Signature";
            };
            default -> key;
        };
    }
}
