package com.schoolos.users;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserDto(
        UUID id,
        UUID schoolId,
        String email,
        String phone,
        String role,
        String name,
        String preferredLanguage,
        Boolean isActive,
        OffsetDateTime keycloakSyncedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
