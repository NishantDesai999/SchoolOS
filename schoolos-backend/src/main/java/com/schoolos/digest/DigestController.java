package com.schoolos.digest;

import com.schoolos.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/digest")
@PreAuthorize("hasAnyRole('admin', 'principal')")
public class DigestController {

    private final DigestService digestService;

    public DigestController(DigestService digestService) {
        this.digestService = digestService;
    }

    @GetMapping("/settings")
    public ApiResponse<DigestSettingsDto> getSettings() {
        return ApiResponse.ok(digestService.getSettings());
    }

    @PutMapping("/settings")
    public ApiResponse<DigestSettingsDto> updateSettings(@RequestBody UpdateDigestSettingsRequest req) {
        return ApiResponse.ok(digestService.updateSettings(req));
    }

    @GetMapping("/preview")
    public ApiResponse<DigestPreviewDto> preview() {
        return ApiResponse.ok(digestService.preview());
    }

    @PostMapping("/send-now")
    public ApiResponse<Void> sendNow() {
        digestService.sendNow();
        return ApiResponse.ok(null);
    }

    @GetMapping("/history")
    public ApiResponse<List<DigestLogDto>> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = digestService.history(page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }
}
