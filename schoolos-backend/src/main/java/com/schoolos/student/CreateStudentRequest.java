package com.schoolos.student;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateStudentRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull LocalDate dateOfBirth,
        @NotBlank String gender,
        String bloodGroup,
        String aadhaarNumber,
        @NotNull LocalDate admissionDate,
        String category,
        Boolean isRte,
        // Enrollment info
        UUID calendarYearId,
        UUID sectionId,
        Integer rollNumber,
        // Guardians
        List<GuardianInput> guardians
) {
    public record GuardianInput(
            String name,
            String relation,
            String phone,
            String email,
            String occupation,
            boolean isPrimary
    ) {}
}
