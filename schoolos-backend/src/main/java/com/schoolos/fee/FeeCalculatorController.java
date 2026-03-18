package com.schoolos.fee;

import com.schoolos.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fee-calculator")
@PreAuthorize("hasAnyRole('admin', 'principal')")
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

    @GetMapping("/by-grade")
    public ApiResponse<FeeCalculationResult> calculateByGrade(
            @RequestParam Integer calendarYear,
            @RequestParam Integer gradeLevel,
            @RequestParam(defaultValue = "1") Integer months) {
        return ApiResponse.ok(feeCalculatorService.calculateByGrade(calendarYear, gradeLevel, months));
    }

    /**
     * Per-student fee calculation with from/to month range.
     * Handles TERM_FEE duplicate-payment detection.
     *
     * GET /fee-calculator/student/{studentId}?fromMonth=2025-06&toMonth=2025-11
     */
    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('admin', 'principal', 'trustee')")
    public ApiResponse<StudentFeeCalculationDto> calculateForStudent(
            @PathVariable UUID studentId,
            @RequestParam String fromMonth,
            @RequestParam String toMonth) {
        return ApiResponse.ok(feeCalculatorService.calculateForStudent(studentId, fromMonth, toMonth));
    }
}
