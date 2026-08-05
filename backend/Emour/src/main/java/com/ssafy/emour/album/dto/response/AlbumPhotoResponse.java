package com.ssafy.emour.album.dto.response;

import com.ssafy.emour.album.entity.AlbumPhoto;

import java.time.LocalDateTime;

/**
 * 앨범 사진 응답.
 * DB에 저장된 이미지 키를 같은 출처에서 조회할 수 있는 상대 경로로 변환한다.
 */
public record AlbumPhotoResponse(
        Long photoId,
        Long roomId,
        Long uploaderId,
        String imageUrl,
        String memo,
        LocalDateTime createdAt
) {
    public static AlbumPhotoResponse of(AlbumPhoto photo) {
        String imageUrl = "/uploads/" + photo.getImageKey();
        return new AlbumPhotoResponse(
                photo.getId(),
                photo.getRoomId(),
                photo.getUploaderId(),
                imageUrl,
                photo.getMemo(),
                photo.getCreatedAt()
        );
    }
}
