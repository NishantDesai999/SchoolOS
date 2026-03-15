package com.schoolos.teacher;

import com.schoolos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teachers/{teacherId}/salary")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class SalaryController {

    private final SalaryService salaryService;

    public SalaryController(SalaryService salaryService) {
        this.salaryService = salaryService;
    }

    @GetMapping
    public ApiResponse<List<SalaryPaymentDto>> list(@PathVariable UUID teacherId) {
        return ApiResponse.ok(salaryService.listByTeacher(teacherId));
    }

    @PostMapping
    public ApiResponse<SalaryPaymentDto> create(@PathVariable UUID teacherId,
                                                  @Valid @RequestBody CreateSalaryPaymentRequest req) {
        return ApiResponse.ok(salaryService.create(teacherId, req));
    }

    @GetMapping("/{id}")
    public ApiResponse<SalaryPaymentDto> getById(@PathVariable UUID teacherId,
                                                   @PathVariable UUID id) {
        return ApiResponse.ok(salaryService.getById(teacherId, id));
    }
}
