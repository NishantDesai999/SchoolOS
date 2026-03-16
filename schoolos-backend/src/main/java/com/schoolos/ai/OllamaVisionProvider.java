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
 * Vision provider using a local Ollama instance with qwen2-vl.
 * Ollama native /api/chat endpoint with images field.
 */
@Component
public class OllamaVisionProvider implements VisionProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaVisionProvider.class);

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.vision-model:qwen2-vl}")
    private String model;

    @Value("${ollama.enabled:true}")
    private boolean enabled;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String name() {
        return "Ollama/" + model;
    }

    @Override
    public boolean isAvailable() {
        return enabled && ollamaBaseUrl != null && !ollamaBaseUrl.isBlank();
    }

    @Override
    public String extractText(byte[] imageBytes, String mimeType, String prompt) throws Exception {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> message = Map.of(
                "role", "user",
                "content", prompt,
                "images", List.of(base64Image)
        );

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(message),
                "stream", false
        );

        String bodyJson = objectMapper.writeValueAsString(requestBody);

        Request request = new Request.Builder()
                .url(ollamaBaseUrl + "/api/chat")
                .header("Content-Type", "application/json")
                .post(RequestBody.create(bodyJson, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Ollama returned HTTP " + response.code());
            }

            JsonNode root = objectMapper.readTree(response.body().string());
            String text = root.path("message").path("content").asText();
            if (text == null || text.isBlank()) {
                throw new RuntimeException("Ollama returned empty content");
            }
            log.debug("Ollama OCR succeeded ({} chars)", text.length());
            return text;
        }
    }
}
