package com.schoolos.slc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SlcDto(
        UUID id,
        UUID schoolId,
        UUID studentId,
        String grNumber,
        LocalDate dateOfLeaving,
        String reason,
        String reasonDetail,
        Integer lastGradeAttended,
        String lastExamPassed,
        String characterConduct,
        String generalRemarks,
        String studentSignatureUrl,
        String guardianSignatureUrl,
        String principalSignatureUrl,
        String slcNumber,
        String status,
        UUID issuedBy,
        OffsetDateTime issuedAt,
        String pdfUrlEn,
        String pdfUrlHi,
        String pdfUrlGu,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
