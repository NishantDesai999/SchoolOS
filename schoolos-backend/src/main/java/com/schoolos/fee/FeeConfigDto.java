package com.schoolos.fee;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record FeeConfigDto(
        UUID id,
        UUID schoolId,
        Integer calendarYear,
        Integer gradeLevel,
        Boolean isActive,
        List<FeeBreakdownItemDto> items,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
