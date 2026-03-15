package com.schoolos.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class StorageService {

    @Value("${app.upload-dir:/uploads}")
    private String uploadDir;

    /**
     * Stores a multipart file in {uploadDir}/{subdir}/{uuid}.{ext}
     *
     * @return relative URL path, e.g. /uploads/signatures/abc123.png
     */
    public String store(MultipartFile file, String subdir) {
        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : "";
        String filename = UUID.randomUUID() + ext;
        return storeInputStream(file::getInputStream, subdir, filename);
    }

    /**
     * Stores raw bytes in {uploadDir}/{subdir}/{filename}
     *
     * @return relative URL path
     */
    public String storeBytes(byte[] data, String subdir, String filename) {
        return storeInputStream(() -> new java.io.ByteArrayInputStream(data), subdir, filename);
    }

    private String storeInputStream(InputStreamSupplier supplier, String subdir, String filename) {
        try {
            Path dir = Paths.get(uploadDir, subdir);
            Files.createDirectories(dir);
            Path dest = dir.resolve(filename);
            try (InputStream in = supplier.get()) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/" + subdir + "/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + filename, e);
        }
    }

    public void delete(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;
        String stripped = relativePath.startsWith("/uploads/")
                ? relativePath.substring("/uploads/".length())
                : relativePath;
        Path file = Paths.get(uploadDir, stripped);
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + relativePath, e);
        }
    }

    @FunctionalInterface
    private interface InputStreamSupplier {
        InputStream get() throws IOException;
    }
}
