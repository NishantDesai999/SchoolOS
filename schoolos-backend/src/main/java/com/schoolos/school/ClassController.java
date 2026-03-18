package com.schoolos.school;

import com.schoolos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/classes")
@PreAuthorize("hasAnyRole('admin', 'principal')")
public class ClassController {

    private final ClassService classService;

    public ClassController(ClassService classService) {
        this.classService = classService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<List<ClassDto>> list(@RequestParam UUID yearId) {
        return ApiResponse.ok(classService.listByYear(yearId));
    }

    @PostMapping
    public ApiResponse<ClassDto> create(@Valid @RequestBody CreateClassRequest req) {
        return ApiResponse.ok(classService.create(req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        classService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/clone")
    public ApiResponse<Void> clone(@RequestParam UUID sourceYearId, @RequestParam UUID targetYearId) {
        classService.cloneClassesAndSections(sourceYearId, targetYearId);
        return ApiResponse.ok(null);
    }
}
