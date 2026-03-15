package com.schoolos.common;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Generic single-URL result for file upload responses.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UrlResult(String url) {
    public static UrlResult of(String url) {
        return new UrlResult(url);
    }
}
