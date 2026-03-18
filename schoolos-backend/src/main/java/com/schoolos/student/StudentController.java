package com.schoolos.student;

import com.schoolos.common.ApiResponse;
import com.schoolos.common.UrlResult;
import com.schoolos.fee.InvoiceService;
import com.schoolos.fee.LedgerEntry;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/students")
@PreAuthorize("hasAnyRole('admin', 'principal')")
public class StudentController {

    private final StudentService studentService;
    private final InvoiceService invoiceService;

    public StudentController(StudentService studentService, InvoiceService invoiceService) {
        this.studentService = studentService;
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public ApiResponse<List<StudentDto>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID yearId,
            @RequestParam(required = false) UUID classId,
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = studentService.list(search, yearId, classId, sectionId, status, page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<StudentDto> create(@Valid @RequestBody CreateStudentRequest req) {
        return ApiResponse.ok(studentService.create(req));
    }

    @GetMapping("/{id}")
    public ApiResponse<StudentDetailDto> getDetail(@PathVariable UUID id) {
        return ApiResponse.ok(studentService.getDetail(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<StudentDto> update(@PathVariable UUID id,
                                          @RequestBody UpdateStudentRequest req) {
        return ApiResponse.ok(studentService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        studentService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/photo")
    public ApiResponse<UrlResult> uploadPhoto(@PathVariable UUID id,
                                               @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(studentService.uploadPhoto(id, file));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<StudentDto> changeStatus(@PathVariable UUID id,
                                                 @RequestParam String status) {
        return ApiResponse.ok(studentService.changeStatus(id, status));
    }

    @GetMapping("/by-gr/{grNumber}")
    public ApiResponse<StudentDto> getByGrNumber(@PathVariable String grNumber) {
        return ApiResponse.ok(studentService.getByGrNumber(grNumber));
    }

    /**
     * Unified ledger: invoices + direct payments, ordered by date descending.
     * Fixes the bug where direct payments were not shown (they have no invoice).
     */
    @GetMapping("/{id}/ledger")
    public ApiResponse<List<LedgerEntry>> getLedger(@PathVariable UUID id) {
        return ApiResponse.ok(invoiceService.getUnifiedLedger(id));
    }
}
