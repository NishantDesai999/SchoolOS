package com.schoolos.govtocr;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record GovtCircularDto(
        UUID id,
        UUID schoolId,
        Integer calendarYear,
        String circularNumber,
        String fileUrl,
        String ocrStatus,
        String ocrExtractedData,
        BigDecimal ocrConfidence,
        UUID uploadedBy,
        OffsetDateTime uploadedAt,
        OffsetDateTime createdAt
) {}
