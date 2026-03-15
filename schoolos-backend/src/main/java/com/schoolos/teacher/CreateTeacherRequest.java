package com.schoolos.teacher;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateTeacherRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank String phone,
        String email,
        LocalDate dateOfBirth,
        @NotBlank String gender,
        String qualification,
        String specialization,
        @NotNull LocalDate dateOfJoining,
        String designation,
        BigDecimal monthlySalary,
        String bankAccount,
        String bankIfsc
) {}
