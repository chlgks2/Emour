package com.ssafy.emour.album.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 앨범 사진. DB 테이블 album_photo 와 매핑.
 *
 * 커플방 단위로 저장하고 조회합니다.
 */
@Entity
@Table(name = "album_photo")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AlbumPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "photo_id")
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "uploader_id", nullable = false)
    private Long uploaderId;

    // DB 에는 전체 URL 이 아니라 저장 key("2026/07/30/abc.jpg")만 저장한다 (팀 규약).
    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageKey;

    @Column(name = "memo", length = 100)
    private String memo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private AlbumPhoto(Long roomId, Long uploaderId, String imageKey, String memo) {
        this.roomId = roomId;
        this.uploaderId = uploaderId;
        this.imageKey = imageKey;
        this.memo = memo;
    }

    /** 한줄 메모 작성/수정 */
    public void updateMemo(String memo) {
        this.memo = memo;
    }
}
