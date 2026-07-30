package com.ssafy.emour.album.dto.response;

import com.ssafy.emour.album.entity.AlbumPhoto;

import java.time.LocalDateTime;

/**
 * 앨범 사진 응답.
 */
public record AlbumPhotoResponse(
        Long photoId,
        Long uploaderId,
        String imageUrl,
        String memo,
        LocalDateTime createdAt
) {
    public static AlbumPhotoResponse from(AlbumPhoto photo) {
        return new AlbumPhotoResponse(
                photo.getId(),
                photo.getUploaderId(),
                photo.getImageUrl(),
                photo.getMemo(),
                photo.getCreatedAt()
        );
    }
}
