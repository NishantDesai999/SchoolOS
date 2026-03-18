package com.schoolos.fee;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record GenerateInvoicesRequest(
        @NotNull UUID calendarYearId,
        @NotNull String periodLabel,
        LocalDate dueDate,   // optional, defaults to 30 days from now
        UUID classId,        // optional, limit to a specific class
        UUID sectionId       // optional, limit to a specific section
) {}
