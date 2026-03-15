package com.schoolos.school;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateCalendarYearRequest(
        @NotNull Integer year,
        @NotBlank String label,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        boolean isCurrent
) {}
