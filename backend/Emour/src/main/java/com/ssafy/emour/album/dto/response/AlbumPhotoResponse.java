package com.ssafy.emour.album.dto.response;

import com.ssafy.emour.album.entity.AlbumPhoto;

import java.time.LocalDateTime;

/**
 * 앨범 사진 응답.
 * DB 엔 key 만 있으므로, 응답을 만들 때 base-url 을 붙여 전체 URL 로 조립해 준다.
 */
public record AlbumPhotoResponse(
        Long photoId,
        Long uploaderId,
        String imageUrl,
        String memo,
        LocalDateTime createdAt
) {
    public static AlbumPhotoResponse of(AlbumPhoto photo, String baseUrl) {
        // baseUrl(예: http://localhost:8080) + /uploads/ + key(2026/07/30/abc.jpg)
        String imageUrl = baseUrl + "/uploads/" + photo.getImageKey();
        return new AlbumPhotoResponse(
                photo.getId(),
                photo.getUploaderId(),
                imageUrl,
                photo.getMemo(),
                photo.getCreatedAt()
        );
    }
}
