package com.schoolos.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        T data,
        ErrorDetail error,
        PageInfo pagination
) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<List<T>> paged(List<T> data, long total, int page, int size) {
        return new ApiResponse<>(true, data, null, new PageInfo(page, size, total));
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message), null);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ErrorDetail(String code, String message) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PageInfo(int page, int size, long total) {}
}
