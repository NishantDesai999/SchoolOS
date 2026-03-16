package com.schoolos.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Vision provider using Google Gemini (gemini-1.5-flash by default).
 * Uses the generateContent REST API with inline base64 image data.
 */
@Component
public class GeminiVisionProvider implements VisionProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiVisionProvider.class);

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String model;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String name() {
        return "Gemini/" + model;
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String extractText(byte[] imageBytes, String mimeType, String prompt) throws Exception {
        String base64Data = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> inlineData = Map.of(
                "mime_type", mimeType,
                "data", base64Data
        );
        Map<String, Object> imagePart = Map.of("inline_data", inlineData);
        Map<String, Object> textPart = Map.of("text", prompt);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(imagePart, textPart))
                )
        );

        String bodyJson = objectMapper.writeValueAsString(requestBody);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        Request request = new Request.Builder()
                .url(url)
                .header("Content-Type", "application/json")
                .post(RequestBody.create(bodyJson, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Gemini returned HTTP " + response.code());
            }

            JsonNode root = objectMapper.readTree(response.body().string());
            String text = root
                    .path("candidates").path(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText();

            if (text == null || text.isBlank()) {
                throw new RuntimeException("Gemini returned empty content");
            }
            log.debug("Gemini OCR succeeded ({} chars)", text.length());
            return text;
        }
    }
}
