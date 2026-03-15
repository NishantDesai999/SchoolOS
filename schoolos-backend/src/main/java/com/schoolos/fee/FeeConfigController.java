package com.schoolos.fee;

import com.schoolos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fee-configs")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class FeeConfigController {

    private final FeeConfigService feeConfigService;

    public FeeConfigController(FeeConfigService feeConfigService) {
        this.feeConfigService = feeConfigService;
    }

    @GetMapping
    public ApiResponse<List<FeeConfigDto>> list(
            @RequestParam(required = false) Integer yearId,
            @RequestParam(required = false) Integer gradeLevel) {
        return ApiResponse.ok(feeConfigService.list(yearId, gradeLevel));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FeeConfigDto> upsert(@Valid @RequestBody UpsertFeeConfigRequest req) {
        return ApiResponse.ok(feeConfigService.upsert(req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        feeConfigService.delete(id);
        return ApiResponse.ok(null);
    }
}
