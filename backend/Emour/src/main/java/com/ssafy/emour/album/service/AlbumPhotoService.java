package com.ssafy.emour.album.service;

import com.ssafy.emour.album.dto.response.AlbumPhotoResponse;
import com.ssafy.emour.album.entity.AlbumPhoto;
import com.ssafy.emour.album.repository.AlbumPhotoRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 앨범 사진 비즈니스 로직.
 *
 * 지금은 "업로더(로그인한 회원)" 기준으로 동작한다.
 * (커플룸 기능이 생기면 방 기준 조회/권한으로 확장 예정)
 */
@Service
@RequiredArgsConstructor
public class AlbumPhotoService {

    private final AlbumPhotoRepository albumPhotoRepository;
    private final FileStorage fileStorage;

    /** 사진 업로드 (파일 저장 → DB 기록) */
    @Transactional
    public AlbumPhotoResponse upload(Long userId, MultipartFile file, String memo) {
        String imageUrl = fileStorage.store(file); // 파일 저장 후 접근 URL 획득

        AlbumPhoto photo = AlbumPhoto.builder()
                .uploaderId(userId)
                .imageUrl(imageUrl)
                .memo(memo)
                .build();

        return AlbumPhotoResponse.from(albumPhotoRepository.save(photo));
    }

    /** 내 사진 전체 조회 (최신순) */
    @Transactional(readOnly = true)
    public List<AlbumPhotoResponse> getMyPhotos(Long userId) {
        return albumPhotoRepository.findByUploaderIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(AlbumPhotoResponse::from)
                .toList();
    }

    /** 사진 삭제 (파일 + DB) */
    @Transactional
    public void delete(Long userId, Long photoId) {
        AlbumPhoto photo = getOwnedPhoto(userId, photoId);
        fileStorage.delete(photo.getImageUrl()); // 실제 파일 삭제
        albumPhotoRepository.delete(photo);       // DB 기록 삭제
    }

    /** 사진 메모 작성/수정 */
    @Transactional
    public AlbumPhotoResponse updateMemo(Long userId, Long photoId, String memo) {
        AlbumPhoto photo = getOwnedPhoto(userId, photoId);
        photo.updateMemo(memo);
        return AlbumPhotoResponse.from(photo);
    }

    /**
     * 사진을 찾고, "내가 올린 사진"이 맞는지 소유권을 확인한다.
     * 남의 사진을 지우거나 수정하지 못하게 막는 방어 로직.
     */
    private AlbumPhoto getOwnedPhoto(Long userId, Long photoId) {
        AlbumPhoto photo = albumPhotoRepository.findById(photoId)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_NOT_FOUND));
        if (!photo.getUploaderId().equals(userId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
        return photo;
    }
}
