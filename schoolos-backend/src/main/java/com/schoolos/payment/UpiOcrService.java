package com.schoolos.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolos.ai.VisionProviderChain;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Service
public class UpiOcrService {

    private static final String PROMPT =
            "Extract UPI payment details from this screenshot. Return ONLY valid JSON with these exact fields: " +
            "{ \"transactionId\": \"string or null\", \"amount\": \"number or null\", " +
            "\"paymentDate\": \"YYYY-MM-DD or null\", \"senderName\": \"string or null\", " +
            "\"senderVpa\": \"string or null\", \"recipientVpa\": \"string or null\", " +
            "\"status\": \"SUCCESS or FAILED or PENDING\" }. " +
            "Do not include any text outside the JSON object.";

    private final VisionProviderChain visionChain;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UpiOcrService(VisionProviderChain visionChain) {
        this.visionChain = visionChain;
    }

    public UpiOcrResult extractFromScreenshot(byte[] imageBytes, String mimeType) {
        String text = visionChain.extractText(imageBytes, mimeType, PROMPT);

        if (text == null) {
            return new UpiOcrResult(null, null, null, null, null, null,
                    "OCR_UNAVAILABLE", 0.0f, "All vision providers failed or none configured");
        }

        return parseOcrResult(text);
    }

    private UpiOcrResult parseOcrResult(String jsonText) {
        try {
            String cleaned = jsonText.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("```[a-z]*\\n?", "").replaceAll("```", "").trim();
            }

            JsonNode data = objectMapper.readTree(cleaned);

            String txnId       = data.hasNonNull("transactionId") ? data.get("transactionId").asText() : null;
            BigDecimal amount  = data.hasNonNull("amount") ? new BigDecimal(data.get("amount").asText()) : null;
            String senderName  = data.hasNonNull("senderName") ? data.get("senderName").asText() : null;
            String senderVpa   = data.hasNonNull("senderVpa") ? data.get("senderVpa").asText() : null;
            String recipientVpa = data.hasNonNull("recipientVpa") ? data.get("recipientVpa").asText() : null;
            String status      = data.hasNonNull("status") ? data.get("status").asText() : "PENDING";

            LocalDate paymentDate = null;
            if (data.hasNonNull("paymentDate")) {
                try {
                    paymentDate = LocalDate.parse(data.get("paymentDate").asText(), DateTimeFormatter.ISO_LOCAL_DATE);
                } catch (DateTimeParseException e) {
                    paymentDate = LocalDate.now();
                }
            }

            return new UpiOcrResult(txnId, amount, paymentDate, senderName, senderVpa, recipientVpa, status, 0.9f, cleaned);
        } catch (Exception e) {
            return new UpiOcrResult(null, null, null, null, null, null, "FAILED", 0.0f, "Parse error: " + e.getMessage());
        }
    }
}
