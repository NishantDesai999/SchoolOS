package com.schoolos.student;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StudentDto(
        UUID id,
        UUID schoolId,
        String grNumber,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        String gender,
        String bloodGroup,
        String aadhaarNumber,
        String photoUrl,
        String status,
        LocalDate admissionDate,
        String category,
        Boolean isRte,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
