package com.schoolos.student;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreateAdmissionRequest(
        UUID calendarYearId,
        Integer targetGradeLevel,
        @NotBlank String studentName,
        @NotNull LocalDate dob,
        @NotBlank String guardianName,
        @NotBlank String guardianPhone,
        String guardianEmail,
        String preferredLanguage,
        String source,
        String notes,
        LocalDate followUpDate
) {}
