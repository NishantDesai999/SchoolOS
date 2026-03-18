package com.schoolos.school;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClassDto(
        UUID id,
        UUID schoolId,
        UUID calendarYearId,
        String name,
        Integer gradeLevel,
        Integer displayOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
