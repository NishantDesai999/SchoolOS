package com.schoolos.slc;

import com.schoolos.common.TenantContext;
import com.schoolos.student.StudentDto;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class SlcService {

    private final DSLContext dsl;
    private final SlcPdfService pdfService;

    public SlcService(DSLContext dsl, SlcPdfService pdfService) {
        this.dsl = dsl;
        this.pdfService = pdfService;
    }

    public record SlcPage(List<SlcDto> data, long total) {}

    public SlcPage list(String search, String status, int page, int size) {
        UUID schoolId = TenantContext.get();
        List<Condition> conditions = new ArrayList<>();
        conditions.add(SCHOOL_LEAVING_CERTIFICATES.SCHOOL_ID.eq(schoolId));
        conditions.add(SCHOOL_LEAVING_CERTIFICATES.DELETED_AT.isNull());

        if (search != null && !search.isBlank()) {
            conditions.add(
                DSL.lower(SCHOOL_LEAVING_CERTIFICATES.GR_NUMBER).like("%" + search.toLowerCase() + "%")
                    .or(DSL.lower(SCHOOL_LEAVING_CERTIFICATES.SLC_NUMBER).like("%" + search.toLowerCase() + "%"))
            );
        }
        if (status != null && !status.isBlank()) {
            conditions.add(SCHOOL_LEAVING_CERTIFICATES.STATUS.eq(status));
        }

        Condition combined = conditions.stream().reduce(DSL.trueCondition(), Condition::and);

        long total = dsl.fetchCount(dsl.selectFrom(SCHOOL_LEAVING_CERTIFICATES).where(combined));
        List<SlcDto> data = dsl.selectFrom(SCHOOL_LEAVING_CERTIFICATES)
                .where(combined)
                .orderBy(SCHOOL_LEAVING_CERTIFICATES.ISSUED_AT.desc())
                .limit(size).offset((long) page * size)
                .fetchInto(SlcDto.class);

        return new SlcPage(data, total);
    }

    @Transactional
    public SlcDto create(CreateSlcRequest req) {
        UUID schoolId = TenantContext.get();
        UUID id = UUID.randomUUID();

        // Get student GR number
        StudentDto student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.ID.eq(req.studentId()))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOneInto(StudentDto.class);
        if (student == null) throw new NoSuchElementException("Student not found");

        String slcNumber = generateSlcNumber(schoolId);
        String studentSigUrl = req.studentSignatureUrl() != null ? req.studentSignatureUrl() : "";
        String guardianSigUrl = req.guardianSignatureUrl() != null ? req.guardianSignatureUrl() : "";

        dsl.insertInto(SCHOOL_LEAVING_CERTIFICATES)
                .set(SCHOOL_LEAVING_CERTIFICATES.ID, id)
                .set(SCHOOL_LEAVING_CERTIFICATES.SCHOOL_ID, schoolId)
                .set(SCHOOL_LEAVING_CERTIFICATES.STUDENT_ID, req.studentId())
                .set(SCHOOL_LEAVING_CERTIFICATES.GR_NUMBER, student.grNumber())
                .set(SCHOOL_LEAVING_CERTIFICATES.DATE_OF_LEAVING, req.dateOfLeaving())
                .set(SCHOOL_LEAVING_CERTIFICATES.REASON, req.reason())
                .set(SCHOOL_LEAVING_CERTIFICATES.REASON_DETAIL, req.reasonDetail())
                .set(SCHOOL_LEAVING_CERTIFICATES.LAST_GRADE_ATTENDED, req.lastGradeAttended())
                .set(SCHOOL_LEAVING_CERTIFICATES.LAST_EXAM_PASSED, req.lastExamPassed())
                .set(SCHOOL_LEAVING_CERTIFICATES.CHARACTER_CONDUCT, req.characterConduct())
                .set(SCHOOL_LEAVING_CERTIFICATES.GENERAL_REMARKS, req.generalRemarks())
                .set(SCHOOL_LEAVING_CERTIFICATES.STUDENT_SIGNATURE_URL, studentSigUrl)
                .set(SCHOOL_LEAVING_CERTIFICATES.GUARDIAN_SIGNATURE_URL, guardianSigUrl)
                .set(SCHOOL_LEAVING_CERTIFICATES.SLC_NUMBER, slcNumber)
                .set(SCHOOL_LEAVING_CERTIFICATES.STATUS, "ISSUED")
                .execute();

        // Update student status to TC_ISSUED
        dsl.update(STUDENTS)
                .set(STUDENTS.STATUS, "TC_ISSUED")
                .set(STUDENTS.UPDATED_AT, OffsetDateTime.now())
                .where(STUDENTS.ID.eq(req.studentId()))
                .execute();

        return getById(id);
    }

    public SlcDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        SlcDto slc = dsl.selectFrom(SCHOOL_LEAVING_CERTIFICATES)
                .where(SCHOOL_LEAVING_CERTIFICATES.ID.eq(id))
                .and(SCHOOL_LEAVING_CERTIFICATES.SCHOOL_ID.eq(schoolId))
                .and(SCHOOL_LEAVING_CERTIFICATES.DELETED_AT.isNull())
                .fetchOneInto(SlcDto.class);
        if (slc == null) throw new NoSuchElementException("SLC not found");
        return slc;
    }

    public SlcDto saveSignature(UUID id, String signatureUrl) {
        UUID schoolId = TenantContext.get();
        dsl.update(SCHOOL_LEAVING_CERTIFICATES)
                .set(SCHOOL_LEAVING_CERTIFICATES.PRINCIPAL_SIGNATURE_URL, signatureUrl)
                .set(SCHOOL_LEAVING_CERTIFICATES.UPDATED_AT, OffsetDateTime.now())
                .where(SCHOOL_LEAVING_CERTIFICATES.ID.eq(id))
                .and(SCHOOL_LEAVING_CERTIFICATES.SCHOOL_ID.eq(schoolId))
                .execute();
        return getById(id);
    }

    public String generatePdf(UUID id, String lang) {
        SlcDto slc = getById(id);
        String pdfUrl = pdfService.generate(slc, lang);

        // Store PDF URL in DB
        String pdfField = switch (lang) {
            case "hi" -> "pdf_url_hi";
            case "gu" -> "pdf_url_gu";
            default -> "pdf_url_en";
        };

        if ("hi".equals(lang)) {
            dsl.update(SCHOOL_LEAVING_CERTIFICATES)
                    .set(SCHOOL_LEAVING_CERTIFICATES.PDF_URL_HI, pdfUrl)
                    .set(SCHOOL_LEAVING_CERTIFICATES.UPDATED_AT, OffsetDateTime.now())
                    .where(SCHOOL_LEAVING_CERTIFICATES.ID.eq(id))
                    .execute();
        } else if ("gu".equals(lang)) {
            dsl.update(SCHOOL_LEAVING_CERTIFICATES)
                    .set(SCHOOL_LEAVING_CERTIFICATES.PDF_URL_GU, pdfUrl)
                    .set(SCHOOL_LEAVING_CERTIFICATES.UPDATED_AT, OffsetDateTime.now())
                    .where(SCHOOL_LEAVING_CERTIFICATES.ID.eq(id))
                    .execute();
        } else {
            dsl.update(SCHOOL_LEAVING_CERTIFICATES)
                    .set(SCHOOL_LEAVING_CERTIFICATES.PDF_URL_EN, pdfUrl)
                    .set(SCHOOL_LEAVING_CERTIFICATES.UPDATED_AT, OffsetDateTime.now())
                    .where(SCHOOL_LEAVING_CERTIFICATES.ID.eq(id))
                    .execute();
        }

        return pdfUrl;
    }

    public record SlcLookupResult(StudentDto student, List<SlcDto> slcs) {}

    public SlcLookupResult lookupByGrNumber(String grNumber) {
        UUID schoolId = TenantContext.get();
        StudentDto student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.GR_NUMBER.eq(grNumber))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOneInto(StudentDto.class);
        if (student == null) throw new NoSuchElementException("Student not found with GR: " + grNumber);

        List<SlcDto> slcs = dsl.selectFrom(SCHOOL_LEAVING_CERTIFICATES)
                .where(SCHOOL_LEAVING_CERTIFICATES.GR_NUMBER.eq(grNumber))
                .and(SCHOOL_LEAVING_CERTIFICATES.DELETED_AT.isNull())
                .orderBy(SCHOOL_LEAVING_CERTIFICATES.ISSUED_AT.desc())
                .fetchInto(SlcDto.class);

        return new SlcLookupResult(student, slcs);
    }

    @Transactional
    public SlcDto cancel(UUID id) {
        UUID schoolId = TenantContext.get();
        dsl.update(SCHOOL_LEAVING_CERTIFICATES)
                .set(SCHOOL_LEAVING_CERTIFICATES.STATUS, "CANCELLED")
                .set(SCHOOL_LEAVING_CERTIFICATES.UPDATED_AT, OffsetDateTime.now())
                .where(SCHOOL_LEAVING_CERTIFICATES.ID.eq(id))
                .and(SCHOOL_LEAVING_CERTIFICATES.SCHOOL_ID.eq(schoolId))
                .execute();
        return getById(id);
    }

    private String generateSlcNumber(UUID schoolId) {
        int year = java.time.LocalDate.now().getYear();
        Integer count = dsl.fetchCount(
                dsl.selectFrom(SCHOOL_LEAVING_CERTIFICATES)
                        .where(SCHOOL_LEAVING_CERTIFICATES.SCHOOL_ID.eq(schoolId))
        );
        return "SLC-" + year + "-" + String.format("%05d", count + 1);
    }
}
