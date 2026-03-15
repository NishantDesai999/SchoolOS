package com.schoolos.common;

import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> SCHOOL_ID = new ThreadLocal<>();

    private TenantContext() {}

    public static UUID get() {
        return SCHOOL_ID.get();
    }

    public static void set(UUID schoolId) {
        SCHOOL_ID.set(schoolId);
    }

    public static void clear() {
        SCHOOL_ID.remove();
    }
}
