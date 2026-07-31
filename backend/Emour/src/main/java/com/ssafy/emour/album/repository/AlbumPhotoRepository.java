package com.ssafy.emour.album.repository;

import com.ssafy.emour.album.entity.AlbumPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 앨범 사진 DB 접근.
 */
public interface AlbumPhotoRepository extends JpaRepository<AlbumPhoto, Long> {

    // 커플룸(방) 기준 사진 조회 — 두 사람이 올린 사진을 최신순으로
    List<AlbumPhoto> findByRoomIdOrderByCreatedAtDesc(Long roomId);
}
