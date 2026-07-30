package com.ssafy.emour.global.storage;

import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * 로컬 디스크에 파일을 저장하는 구현체.
 *
 * 저장 위치: file.upload-dir (application.yml)
 * 접근 URL : file.base-url + "/" + 저장파일명  (WebConfig 가 정적 리소스로 서빙)
 */
@Slf4j
@Component
public class LocalFileStorage implements FileStorage {

    private final Path uploadDir;
    private final String baseUrl;

    public LocalFileStorage(
            @Value("${file.upload-dir}") String uploadDir,
            @Value("${file.base-url}") String baseUrl
    ) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl;
        try {
            Files.createDirectories(this.uploadDir); // 폴더 없으면 생성
        } catch (IOException e) {
            throw new IllegalStateException("업로드 디렉토리 생성 실패: " + this.uploadDir, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        // 중복/충돌 없는 고유 파일명 생성 (원본 확장자 유지)
        String filename = UUID.randomUUID().toString().replace("-", "")
                + extractExtension(file.getOriginalFilename());
        try {
            file.transferTo(uploadDir.resolve(filename)); // 실제 저장
            return baseUrl + "/" + filename;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.FILE_STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String url) {
        try {
            String filename = url.substring(url.lastIndexOf('/') + 1);
            Files.deleteIfExists(uploadDir.resolve(filename));
        } catch (Exception e) {
            // 파일 삭제 실패는 치명적이지 않으므로 로깅만 하고 넘어간다
            log.warn("파일 삭제 실패: {}", url, e);
        }
    }

    private String extractExtension(String originalName) {
        if (originalName == null) return "";
        int dot = originalName.lastIndexOf('.');
        return (dot >= 0) ? originalName.substring(dot) : "";
    }
}
