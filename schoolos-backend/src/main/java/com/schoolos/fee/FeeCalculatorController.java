package com.schoolos.fee;

import com.schoolos.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/fee-calculator")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class FeeCalculatorController {

    private final FeeCalculatorService feeCalculatorService;

    public FeeCalculatorController(FeeCalculatorService feeCalculatorService) {
        this.feeCalculatorService = feeCalculatorService;
    }

    @GetMapping
    public ApiResponse<FeeCalculationResult> calculate(
            @RequestParam String grNumber,
            @RequestParam(required = false) Integer yearId) {
        return ApiResponse.ok(feeCalculatorService.calculate(grNumber, yearId));
    }
}
