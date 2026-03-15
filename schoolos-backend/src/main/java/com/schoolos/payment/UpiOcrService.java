package com.schoolos.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class UpiOcrService {

    @Value("${anthropic.api-key:}")
    private String anthropicApiKey;

    @Value("${anthropic.api-url:https://api.anthropic.com/v1/messages}")
    private String anthropicApiUrl;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UpiOcrResult extractFromScreenshot(byte[] imageBytes, String mimeType) {
        if (anthropicApiKey == null || anthropicApiKey.isBlank()) {
            return new UpiOcrResult(null, null, null, null, null, null, "OCR_UNAVAILABLE", 0.0f, "API key not configured");
        }

        try {
            String base64Data = Base64.getEncoder().encodeToString(imageBytes);

            // Build request using internal Maps (not API response, acceptable)
            Map<String, Object> imageSource = Map.of(
                    "type", "base64",
                    "media_type", mimeType,
                    "data", base64Data
            );
            Map<String, Object> imageContent = Map.of("type", "image", "source", imageSource);
            Map<String, Object> textContent = Map.of(
                    "type", "text",
                    "text", "Extract UPI payment details from this screenshot. Return ONLY valid JSON with these exact fields: " +
                            "{ \"transactionId\": \"string or null\", \"amount\": \"number or null\", " +
                            "\"paymentDate\": \"YYYY-MM-DD or null\", \"senderName\": \"string or null\", " +
                            "\"senderVpa\": \"string or null\", \"recipientVpa\": \"string or null\", " +
                            "\"status\": \"SUCCESS or FAILED or PENDING\" }. " +
                            "Do not include any text outside the JSON object."
            );
            Map<String, Object> message = Map.of("role", "user", "content", List.of(imageContent, textContent));
            Map<String, Object> requestBody = Map.of(
                    "model", "claude-opus-4-6",
                    "max_tokens", 512,
                    "messages", List.of(message)
            );

            String bodyJson = objectMapper.writeValueAsString(requestBody);

            Request request = new Request.Builder()
                    .url(anthropicApiUrl)
                    .header("x-api-key", anthropicApiKey)
                    .header("anthropic-version", "2023-06-01")
                    .header("Content-Type", "application/json")
                    .post(RequestBody.create(bodyJson, MediaType.parse("application/json")))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) {
                    return new UpiOcrResult(null, null, null, null, null, null, "FAILED", 0.0f, "API error: " + response.code());
                }

                String responseBody = response.body().string();
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode contentArr = root.path("content");

                if (contentArr.isArray() && contentArr.size() > 0) {
                    String extractedText = contentArr.get(0).path("text").asText();
                    return parseOcrResult(extractedText);
                }

                return new UpiOcrResult(null, null, null, null, null, null, "FAILED", 0.0f, "No content in response");
            }
        } catch (IOException e) {
            return new UpiOcrResult(null, null, null, null, null, null, "FAILED", 0.0f, "OCR error: " + e.getMessage());
        }
    }

    private UpiOcrResult parseOcrResult(String jsonText) {
        try {
            // Strip any markdown code blocks if present
            String cleaned = jsonText.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("```[a-z]*\\n?", "").replaceAll("```", "").trim();
            }

            JsonNode data = objectMapper.readTree(cleaned);

            String txnId = data.hasNonNull("transactionId") ? data.get("transactionId").asText() : null;
            BigDecimal amount = data.hasNonNull("amount") ? new BigDecimal(data.get("amount").asText()) : null;
            String senderName = data.hasNonNull("senderName") ? data.get("senderName").asText() : null;
            String senderVpa = data.hasNonNull("senderVpa") ? data.get("senderVpa").asText() : null;
            String recipientVpa = data.hasNonNull("recipientVpa") ? data.get("recipientVpa").asText() : null;
            String status = data.hasNonNull("status") ? data.get("status").asText() : "PENDING";

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
