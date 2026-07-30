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
 * room_id(커플룸)는 아직 커플 연결 기능이 없어서 지금은 비워둔다(nullable).
 * → 커플룸 기능이 생기면 업로드 시 room_id 를 채우고, 조회를 방(room) 기준으로 바꾼다. (TODO)
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

    @Column(name = "room_id")
    private Long roomId; // TODO: 커플룸 연동 시 NOT NULL 로

    @Column(name = "uploader_id", nullable = false)
    private Long uploaderId;

    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;

    @Column(name = "memo", length = 500)
    private String memo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private AlbumPhoto(Long roomId, Long uploaderId, String imageUrl, String memo) {
        this.roomId = roomId;
        this.uploaderId = uploaderId;
        this.imageUrl = imageUrl;
        this.memo = memo;
    }

    /** 한줄 메모 작성/수정 */
    public void updateMemo(String memo) {
        this.memo = memo;
    }
}
