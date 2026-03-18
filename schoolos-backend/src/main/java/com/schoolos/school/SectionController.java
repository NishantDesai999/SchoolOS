package com.schoolos.school;

import com.schoolos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sections")
@PreAuthorize("hasAnyRole('admin', 'principal')")
public class SectionController {

    private final SectionService sectionService;

    public SectionController(SectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<List<SectionDto>> list(@RequestParam UUID classId) {
        return ApiResponse.ok(sectionService.listByClass(classId));
    }

    @PostMapping
    public ApiResponse<SectionDto> create(@Valid @RequestBody CreateSectionRequest req) {
        return ApiResponse.ok(sectionService.create(req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        sectionService.delete(id);
        return ApiResponse.ok(null);
    }
}
