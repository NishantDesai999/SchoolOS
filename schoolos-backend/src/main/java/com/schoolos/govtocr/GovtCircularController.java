package com.schoolos.govtocr;

import com.schoolos.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/govt-circulars")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class GovtCircularController {

    private final GovtCircularService govtCircularService;

    public GovtCircularController(GovtCircularService govtCircularService) {
        this.govtCircularService = govtCircularService;
    }

    @GetMapping
    public ApiResponse<List<GovtCircularDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = govtCircularService.list(page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping("/upload")
    public ApiResponse<GovtCircularDto> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(govtCircularService.upload(file));
    }

    @GetMapping("/{id}")
    public ApiResponse<GovtCircularDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(govtCircularService.getById(id));
    }
}
