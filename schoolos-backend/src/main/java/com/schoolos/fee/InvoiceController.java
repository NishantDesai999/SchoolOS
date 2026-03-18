package com.schoolos.fee;

import com.schoolos.common.ApiResponse;
import com.schoolos.common.UrlResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/invoices")
@PreAuthorize("hasAnyRole('admin', 'principal')")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public ApiResponse<List<InvoiceDto>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID yearId,
            @RequestParam(required = false) UUID classId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = invoiceService.list(search, yearId, classId, status, page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<List<InvoiceDto>> generate(@Valid @RequestBody GenerateInvoicesRequest req) {
        return ApiResponse.ok(invoiceService.generateBulk(req));
    }

    @GetMapping("/{id}")
    public ApiResponse<InvoiceDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(invoiceService.getById(id));
    }

    @GetMapping("/student/{studentId}")
    public ApiResponse<List<InvoiceDto>> getStudentLedger(
            @PathVariable UUID studentId,
            @RequestParam(required = false) UUID yearId) {
        return ApiResponse.ok(invoiceService.getStudentLedger(studentId, yearId));
    }

    @PostMapping("/student-collect")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<InvoiceWithPaymentDto> collectForStudent(@RequestBody CollectFeeRequest req) {
        return ApiResponse.ok(invoiceService.collectForStudent(req));
    }

    @GetMapping("/defaulters")
    public ApiResponse<List<InvoiceDto>> getDefaulters(
            @RequestParam(required = false) UUID yearId) {
        return ApiResponse.ok(invoiceService.getDefaulters(yearId));
    }

    @GetMapping("/{id}/pdf")
    public ApiResponse<UrlResult> getPdf(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "en") String lang) {
        return ApiResponse.ok(UrlResult.of(invoiceService.generatePdf(id, lang)));
    }
}
