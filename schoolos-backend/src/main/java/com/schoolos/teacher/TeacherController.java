package com.schoolos.teacher;

import com.schoolos.common.ApiResponse;
import com.schoolos.common.UrlResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teachers")
@PreAuthorize("hasRole('ADMIN')")
public class TeacherController {

    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ApiResponse<List<TeacherDto>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = teacherService.list(search, page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping
    public ApiResponse<TeacherDto> create(@Valid @RequestBody CreateTeacherRequest req) {
        return ApiResponse.ok(teacherService.create(req));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ApiResponse<TeacherDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(teacherService.getById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<TeacherDto> update(@PathVariable UUID id,
                                           @RequestBody CreateTeacherRequest req) {
        return ApiResponse.ok(teacherService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        teacherService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/photo")
    public ApiResponse<UrlResult> uploadPhoto(@PathVariable UUID id,
                                               @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(teacherService.uploadPhoto(id, file));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<TeacherDto> toggleStatus(@PathVariable UUID id) {
        return ApiResponse.ok(teacherService.toggleStatus(id));
    }
}
