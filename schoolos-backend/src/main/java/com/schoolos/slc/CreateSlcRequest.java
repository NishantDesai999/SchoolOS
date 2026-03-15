package com.schoolos.slc;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreateSlcRequest(
        @NotNull UUID studentId,
        @NotNull LocalDate dateOfLeaving,
        @NotBlank String reason,
        String reasonDetail,
        @NotNull Integer lastGradeAttended,
        String lastExamPassed,
        @NotBlank String characterConduct,
        String generalRemarks,
        String studentSignatureUrl,
        String guardianSignatureUrl
) {}
