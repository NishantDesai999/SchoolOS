package com.schoolos.users;

import com.schoolos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<UserDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = userService.list(page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @PostMapping
    public ApiResponse<UserDto> create(@Valid @RequestBody CreateUserRequest req) {
        return ApiResponse.ok(userService.create(req));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(userService.getById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserDto> update(@PathVariable UUID id,
                                        @RequestBody UpdateUserRequest req) {
        return ApiResponse.ok(userService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ApiResponse.ok(null);
    }
}
