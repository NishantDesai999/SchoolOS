package com.schoolos.slc;

import com.schoolos.common.ApiResponse;
import com.schoolos.common.UrlResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/slc")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class SlcController {

    private final SlcService slcService;

    public SlcController(SlcService slcService) {
        this.slcService = slcService;
    }

    @GetMapping
    public ApiResponse<List<SlcDto>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = slcService.list(search, status, page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SlcDto> create(@Valid @RequestBody CreateSlcRequest req) {
        return ApiResponse.ok(slcService.create(req));
    }

    @GetMapping("/{id}")
    public ApiResponse<SlcDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(slcService.getById(id));
    }

    @PutMapping("/{id}/sign")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SlcDto> sign(@PathVariable UUID id,
                                     @RequestParam String signatureUrl) {
        return ApiResponse.ok(slcService.saveSignature(id, signatureUrl));
    }

    @GetMapping("/{id}/pdf")
    public ApiResponse<UrlResult> getPdf(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "en") String lang) {
        return ApiResponse.ok(UrlResult.of(slcService.generatePdf(id, lang)));
    }

    @PostMapping("/lookup")
    public ApiResponse<SlcService.SlcLookupResult> lookup(@RequestParam String grNumber) {
        return ApiResponse.ok(slcService.lookupByGrNumber(grNumber));
    }
}
