package com.ssafy.emour.album.repository;

import com.ssafy.emour.album.entity.AlbumPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 앨범 사진 DB 접근.
 */
public interface AlbumPhotoRepository extends JpaRepository<AlbumPhoto, Long> {

    // 내가 올린 사진을 최신순으로 조회
    List<AlbumPhoto> findByUploaderIdOrderByCreatedAtDesc(Long uploaderId);
}
