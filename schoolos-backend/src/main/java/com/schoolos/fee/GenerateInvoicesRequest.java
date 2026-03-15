package com.schoolos.fee;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record GenerateInvoicesRequest(
        @NotNull UUID feeConfigId,
        @NotNull String periodLabel,
        @NotNull LocalDate dueDate,
        UUID classId,
        UUID sectionId
) {}
