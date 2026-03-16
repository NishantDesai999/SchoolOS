package com.schoolos.ai;

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
 * Vision provider using Anthropic Claude (claude-opus-4-6 by default).
 */
@Component
public class ClaudeVisionProvider implements VisionProvider {

    private static final Logger log = LoggerFactory.getLogger(ClaudeVisionProvider.class);

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.api-url:https://api.anthropic.com/v1/messages}")
    private String apiUrl;

    @Value("${anthropic.model:claude-opus-4-6}")
    private String model;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String name() {
        return "Claude/" + model;
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String extractText(byte[] imageBytes, String mimeType, String prompt) throws Exception {
        String base64Data = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> imageSource = Map.of(
                "type", "base64",
                "media_type", mimeType,
                "data", base64Data
        );
        Map<String, Object> imageContent = Map.of("type", "image", "source", imageSource);
        Map<String, Object> textContent = Map.of("type", "text", "text", prompt);
        Map<String, Object> message = Map.of("role", "user", "content", List.of(imageContent, textContent));

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "max_tokens", 2000,
                "messages", List.of(message)
        );

        String bodyJson = objectMapper.writeValueAsString(requestBody);

        Request request = new Request.Builder()
                .url(apiUrl)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .post(RequestBody.create(bodyJson, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Claude returned HTTP " + response.code());
            }

            String responseBody = response.body().string();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>)
                    objectMapper.readValue(responseBody, Map.class).get("content");

            if (content != null && !content.isEmpty()) {
                String text = (String) content.get(0).get("text");
                if (text != null && !text.isBlank()) {
                    log.debug("Claude OCR succeeded ({} chars)", text.length());
                    return text;
                }
            }
            throw new RuntimeException("Claude returned empty content");
        }
    }
}
