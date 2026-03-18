package com.schoolos.school;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CalendarYearDto(
        UUID id,
        UUID schoolId,
        Integer year,
        String label,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isCurrent,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
