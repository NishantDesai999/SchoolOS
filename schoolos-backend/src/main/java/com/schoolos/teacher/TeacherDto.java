package com.schoolos.teacher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TeacherDto(
        UUID id,
        UUID schoolId,
        String employeeId,
        String firstName,
        String lastName,
        String phone,
        String email,
        LocalDate dateOfBirth,
        String gender,
        String qualification,
        String specialization,
        LocalDate dateOfJoining,
        String designation,
        String photoUrl,
        String status,
        BigDecimal monthlySalary,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
