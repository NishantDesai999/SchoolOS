package com.schoolos.payment;

import com.schoolos.common.ApiResponse;
import com.schoolos.common.UrlResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public ApiResponse<List<PaymentDto>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = paymentService.list(search, page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping
    public ApiResponse<PaymentDto> create(@Valid @RequestBody CreatePaymentRequest req) {
        return ApiResponse.ok(paymentService.create(req));
    }

    @GetMapping("/{id}")
    public ApiResponse<PaymentDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(paymentService.getById(id));
    }

    @GetMapping("/{id}/receipt")
    public ApiResponse<UrlResult> getReceipt(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "en") String lang) {
        return ApiResponse.ok(UrlResult.of(paymentService.getReceipt(id, lang)));
    }

    @PostMapping("/upi-ocr")
    public ApiResponse<UpiOcrResult> upiOcr(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(paymentService.processUpiScreenshot(file));
    }
}
