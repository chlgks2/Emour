package com.ssafy.emour.global.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * 파일 저장 추상화.
 *
 * store() 는 저장 위치를 식별하는 "key"(예: "2026/07/30/abc.jpg")를 반환한다.
 * DB 에는 이 key 만 저장하고, 전체 URL 은 응답을 만들 때 조립한다.
 * (로컬 저장 → 나중에 S3 로 바꿔도 key 규약은 그대로 유지)
 */
public interface FileStorage {

    /** 파일을 저장하고, 저장 위치를 식별하는 key 를 반환한다. */
    String store(MultipartFile file);

    /** key 로 식별되는 파일을 삭제한다. */
    void delete(String key);
}
