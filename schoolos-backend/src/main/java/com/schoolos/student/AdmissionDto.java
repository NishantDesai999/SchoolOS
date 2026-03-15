package com.schoolos.student;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdmissionDto(
        UUID id,
        UUID schoolId,
        UUID calendarYearId,
        Integer targetGradeLevel,
        String studentName,
        LocalDate dob,
        String guardianName,
        String guardianPhone,
        String guardianEmail,
        String preferredLanguage,
        String status,
        String source,
        String notes,
        LocalDate followUpDate,
        OffsetDateTime appliedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
