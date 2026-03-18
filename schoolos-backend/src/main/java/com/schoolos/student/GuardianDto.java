package com.schoolos.student;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GuardianDto(
        UUID id,
        String name,
        String relation,
        String phone,
        String email,
        String occupation,
        Boolean isPrimary,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
