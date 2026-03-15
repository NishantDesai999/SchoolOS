package com.schoolos.school;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateSectionRequest(
        @NotNull UUID classId,
        @NotBlank String name,
        Integer capacity
) {}
