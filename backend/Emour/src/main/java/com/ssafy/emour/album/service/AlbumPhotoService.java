package com.ssafy.emour.album.service;

import com.ssafy.emour.album.dto.response.AlbumPhotoResponse;
import com.ssafy.emour.album.entity.AlbumPhoto;
import com.ssafy.emour.album.repository.AlbumPhotoRepository;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 앨범 사진 비즈니스 로직.
 *
 * 앨범은 "커플룸(방)" 단위로 공유된다. 로그인한 회원의 활성 커플룸을 찾아
 * 그 방에 사진을 올리고, 그 방의 사진(두 사람 것)을 함께 조회한다.
 * 커플 연결이 없으면 앨범을 쓸 수 없다.
 */
@Service
@RequiredArgsConstructor
public class AlbumPhotoService {

    private final AlbumPhotoRepository albumPhotoRepository;
    private final CoupleMemberRepository coupleMemberRepository; // 내 활성 커플룸 조회용
    private final FileStorage fileStorage;

    @Value("${app.upload.base-url}")
    private String baseUrl;

    /** 사진 업로드 (내 커플룸에 저장) */
    @Transactional
    public AlbumPhotoResponse upload(Long userId, MultipartFile file, String memo) {
        Long roomId = getActiveRoomId(userId);
        String key = fileStorage.store(file);

        AlbumPhoto photo = AlbumPhoto.builder()
                .roomId(roomId)
                .uploaderId(userId)
                .imageKey(key)
                .memo(memo)
                .build();

        return AlbumPhotoResponse.of(albumPhotoRepository.save(photo), baseUrl);
    }

    /** 내 커플룸의 사진 전체 조회 (두 사람 것, 최신순) */
    @Transactional(readOnly = true)
    public List<AlbumPhotoResponse> getMyPhotos(Long userId) {
        Long roomId = getActiveRoomId(userId);
        return albumPhotoRepository.findByRoomIdOrderByCreatedAtDesc(roomId)
                .stream()
                .map(photo -> AlbumPhotoResponse.of(photo, baseUrl))
                .toList();
    }

    /** 사진 삭제 (파일 + DB) */
    @Transactional
    public void delete(Long userId, Long photoId) {
        AlbumPhoto photo = getAccessiblePhoto(userId, photoId);
        fileStorage.delete(photo.getImageKey());
        albumPhotoRepository.delete(photo);
    }

    /** 사진 메모 작성/수정 */
    @Transactional
    public AlbumPhotoResponse updateMemo(Long userId, Long photoId, String memo) {
        AlbumPhoto photo = getAccessiblePhoto(userId, photoId);
        photo.updateMemo(memo);
        return AlbumPhotoResponse.of(photo, baseUrl);
    }

    /** 로그인한 회원의 현재 활성 커플룸 id (없으면 예외) */
    private Long getActiveRoomId(Long userId) {
        return coupleMemberRepository.findActiveRoomIdByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND));
    }

    /**
     * 사진이 "내 커플룸"의 사진인지 확인한다.
     * 같은 방이면 두 사람 모두 조회/삭제/메모가 가능하다(공유 앨범).
     */
    private AlbumPhoto getAccessiblePhoto(Long userId, Long photoId) {
        AlbumPhoto photo = albumPhotoRepository.findById(photoId)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_NOT_FOUND));

        Long roomId = getActiveRoomId(userId);
        if (photo.getRoomId() == null || !photo.getRoomId().equals(roomId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
        return photo;
    }
}
