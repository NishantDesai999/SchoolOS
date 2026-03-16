package com.schoolos.ai;

/**
 * A pluggable vision/OCR provider. Implementations try in order:
 * 1. Ollama (qwen2-vl, local)
 * 2. Gemini (Google)
 * 3. Claude (Anthropic)
 */
public interface VisionProvider {

    /** Human-readable name for logging. */
    String name();

    /** Returns true if this provider is configured and should be attempted. */
    boolean isAvailable();

    /**
     * Extracts text from an image using this provider.
     *
     * @param imageBytes raw image bytes
     * @param mimeType   e.g. "image/jpeg"
     * @param prompt     the instruction prompt
     * @return extracted text
     * @throws Exception if the provider fails (caller will try next)
     */
    String extractText(byte[] imageBytes, String mimeType, String prompt) throws Exception;
}
