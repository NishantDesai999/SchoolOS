package com.schoolos.school;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateClassRequest(
        @NotNull UUID calendarYearId,
        @NotBlank String name,
        @NotNull Integer gradeLevel,
        Integer displayOrder
) {}
