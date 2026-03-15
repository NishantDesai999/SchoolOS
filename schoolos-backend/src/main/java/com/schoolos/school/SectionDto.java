package com.schoolos.school;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SectionDto(
        UUID id,
        UUID classId,
        String name,
        Integer capacity,
        UUID classTeacherId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
