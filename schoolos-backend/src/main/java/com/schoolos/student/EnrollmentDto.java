package com.schoolos.student;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EnrollmentDto(
        UUID id,
        UUID studentId,
        UUID sectionId,
        UUID calendarYearId,
        Integer rollNumber,
        LocalDate enrollmentDate,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
