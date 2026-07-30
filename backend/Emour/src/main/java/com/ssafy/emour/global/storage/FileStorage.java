package com.ssafy.emour.global.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * 파일 저장 추상화.
 *
 * 지금은 로컬 디스크에 저장하는 LocalFileStorage 를 쓰고,
 * 나중에 S3 업로드(S3FileStorage)로 이 구현체만 갈아끼우면 된다.
 */
public interface FileStorage {

    /** 파일을 저장하고, 외부에서 접근 가능한 URL 을 반환한다. */
    String store(MultipartFile file);

    /** 저장된 파일을 삭제한다. (URL 로 식별) */
    void delete(String url);
}
