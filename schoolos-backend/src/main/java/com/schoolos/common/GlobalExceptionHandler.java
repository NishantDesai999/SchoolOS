package com.schoolos.common;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.Locale;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NoSuchElementException ex, WebRequest request) {
        String msg = messageSource.getMessage("error.not.found", null, ex.getMessage(), resolveLocale(request));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("NOT_FOUND", msg));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        String msg = messageSource.getMessage("error.access.denied", null, ex.getMessage(), resolveLocale(request));
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("FORBIDDEN", msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        String field = ex.getBindingResult().getFieldErrors().isEmpty()
                ? "unknown"
                : ex.getBindingResult().getFieldErrors().get(0).getField();
        String defaultMsg = ex.getBindingResult().getFieldErrors().isEmpty()
                ? ex.getMessage()
                : ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
        String msg = messageSource.getMessage("error.validation", new Object[]{field, defaultMsg},
                defaultMsg, resolveLocale(request));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("VALIDATION_ERROR", msg));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex, WebRequest request) {
        String msg = messageSource.getMessage("error.validation", null, ex.getMessage(), resolveLocale(request));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("VALIDATION_ERROR", msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex, WebRequest request) {
        log.error("Unhandled exception", ex);
        String msg = messageSource.getMessage("error.internal", null, "An unexpected error occurred", resolveLocale(request));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("INTERNAL_ERROR", msg));
    }

    private Locale resolveLocale(WebRequest request) {
        String lang = request.getHeader("Accept-Language");
        if (lang != null) {
            return switch (lang.split(",")[0].strip().toLowerCase()) {
                case "hi" -> new Locale("hi");
                case "gu" -> new Locale("gu");
                default -> Locale.ENGLISH;
            };
        }
        return Locale.ENGLISH;
    }
}
