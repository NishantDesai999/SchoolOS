package com.schoolos.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Tries vision providers in priority order:
 *   1. Ollama / qwen2-vl  (local, free)
 *   2. Gemini             (Google)
 *   3. Claude             (Anthropic)
 *
 * Falls through to the next provider on any failure.
 * Returns null if all providers fail.
 */
@Service
public class VisionProviderChain {

    private static final Logger log = LoggerFactory.getLogger(VisionProviderChain.class);

    private final List<VisionProvider> providers;

    public VisionProviderChain(
            OllamaVisionProvider ollama,
            GeminiVisionProvider gemini,
            ClaudeVisionProvider claude) {
        // Order matters: Ollama → Gemini → Claude
        this.providers = List.of(ollama, gemini, claude);
    }

    /**
     * Attempts each provider in order and returns the first successful result.
     *
     * @return extracted text, or null if every provider failed
     */
    public String extractText(byte[] imageBytes, String mimeType, String prompt) {
        for (VisionProvider provider : providers) {
            if (!provider.isAvailable()) {
                log.debug("Skipping {} (not configured)", provider.name());
                continue;
            }
            try {
                log.info("Trying vision provider: {}", provider.name());
                String result = provider.extractText(imageBytes, mimeType, prompt);
                log.info("Vision OCR succeeded with provider: {}", provider.name());
                return result;
            } catch (Exception e) {
                log.warn("Vision provider {} failed: {}. Trying next.", provider.name(), e.getMessage());
            }
        }
        log.error("All vision providers failed for this image.");
        return null;
    }
}
