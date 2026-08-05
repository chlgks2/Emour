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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 로컬 디스크에 파일을 저장하는 구현체.
 *
 * 저장 위치: app.upload.dir (로컬 ./uploads, EC2 /app/uploads)
 * 반환 key : "yyyy/MM/dd/{uuid}.ext"  ← DB 에는 이 key 만 저장한다.
 */
@Slf4j
@Component
public class LocalFileStorage implements FileStorage {

    private static final DateTimeFormatter DATE_PATH = DateTimeFormatter.ofPattern("yyyy/MM/dd");

    private final Path baseDir;

    public LocalFileStorage(@Value("${app.upload.dir}") String uploadDir) {
        this.baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("업로드 디렉토리 생성 실패: " + this.baseDir, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        // key = 날짜폴더 + UUID 파일명 (원본 확장자 유지, 원본 파일명은 사용 안 함)
        String key = LocalDate.now().format(DATE_PATH)
                + "/" + UUID.randomUUID().toString().replace("-", "")
                + extractExtension(file.getOriginalFilename());
        try {
            Path target = baseDir.resolve(key);
            Files.createDirectories(target.getParent()); // 날짜 폴더 생성
            file.transferTo(target);
            return key;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.FILE_STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(baseDir.resolve(key));
        } catch (Exception e) {
            // 파일 삭제 실패는 치명적이지 않으므로 로깅만 하고 넘어간다
            log.warn("파일 삭제 실패: {}", key, e);
        }
    }

    private String extractExtension(String originalName) {
        if (originalName == null) return "";
        int dot = originalName.lastIndexOf('.');
        return (dot >= 0) ? originalName.substring(dot) : "";
    }
}
