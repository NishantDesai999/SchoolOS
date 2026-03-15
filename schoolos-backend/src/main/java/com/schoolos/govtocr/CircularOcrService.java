package com.schoolos.govtocr;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class CircularOcrService {

    @Value("${anthropic.api-key:}")
    private String anthropicApiKey;

    @Value("${anthropic.api-url:https://api.anthropic.com/v1/messages}")
    private String anthropicApiUrl;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OcrResult extractText(byte[] fileBytes, String mimeType) {
        if (anthropicApiKey == null || anthropicApiKey.isBlank()) {
            return new OcrResult("OCR_UNAVAILABLE", "{}", 0.0f, "Anthropic API key not configured");
        }

        try {
            String base64Data = Base64.getEncoder().encodeToString(fileBytes);

            Map<String, Object> imageSource = Map.of(
                    "type", "base64",
                    "media_type", mimeType,
                    "data", base64Data
            );

            Map<String, Object> imageContent = Map.of(
                    "type", "image",
                    "source", imageSource
            );

            Map<String, Object> textContent = Map.of(
                    "type", "text",
                    "text", "This is a government circular/notice. Please extract all text from this document and return it as structured JSON with fields: circular_number, date, subject, body, issued_by, instructions. Extract all text faithfully."
            );

            Map<String, Object> message = Map.of(
                    "role", "user",
                    "content", List.of(imageContent, textContent)
            );

            Map<String, Object> requestBody = Map.of(
                    "model", "claude-opus-4-6",
                    "max_tokens", 2000,
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
                    return new OcrResult("FAILED", "{}", 0.0f, "Claude API call failed: " + response.code());
                }

                String responseBody = response.body().string();
                Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> content = (List<Map<String, Object>>) responseMap.get("content");
                if (content != null && !content.isEmpty()) {
                    String extractedText = (String) content.get(0).get("text");
                    return new OcrResult("EXTRACTED", "{\"text\": " + objectMapper.writeValueAsString(extractedText) + "}", 0.9f, extractedText);
                }

                return new OcrResult("FAILED", "{}", 0.0f, "No content in response");
            }
        } catch (IOException e) {
            return new OcrResult("FAILED", "{}", 0.0f, "OCR error: " + e.getMessage());
        }
    }

    public record OcrResult(
            String status,
            String extractedDataJson,
            float confidence,
            String rawText
    ) {}
}
