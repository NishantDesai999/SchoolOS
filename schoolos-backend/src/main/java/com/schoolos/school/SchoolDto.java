package com.schoolos.school;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SchoolDto(
        UUID id,
        String name,
        String code,
        String board,
        String address,
        String phone,
        String email,
        String logoUrl,
        String principalSignatureUrl,
        String defaultLanguage,
        String ownerWhatsapp,
        String ownerEmail,
        LocalTime digestTime,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
