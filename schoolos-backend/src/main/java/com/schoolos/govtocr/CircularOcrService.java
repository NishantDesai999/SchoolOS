package com.schoolos.govtocr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolos.ai.VisionProviderChain;
import org.springframework.stereotype.Service;

@Service
public class CircularOcrService {

    private static final String PROMPT =
            "This is a government circular/notice. Please extract all text from this document " +
            "and return it as structured JSON with fields: circular_number, date, subject, body, " +
            "issued_by, instructions. Extract all text faithfully.";

    private final VisionProviderChain visionChain;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CircularOcrService(VisionProviderChain visionChain) {
        this.visionChain = visionChain;
    }

    public OcrResult extractText(byte[] fileBytes, String mimeType) {
        String text = visionChain.extractText(fileBytes, mimeType, PROMPT);

        if (text == null) {
            return new OcrResult("FAILED", "{}", 0.0f, "All vision providers failed or none configured");
        }

        try {
            return new OcrResult(
                    "EXTRACTED",
                    "{\"text\": " + objectMapper.writeValueAsString(text) + "}",
                    0.9f,
                    text
            );
        } catch (Exception e) {
            return new OcrResult("FAILED", "{}", 0.0f, "Serialization error: " + e.getMessage());
        }
    }

    public record OcrResult(
            String status,
            String extractedDataJson,
            float confidence,
            String rawText
    ) {}
}
