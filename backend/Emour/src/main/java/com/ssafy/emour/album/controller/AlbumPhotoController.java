package com.ssafy.emour.album.controller;

import com.ssafy.emour.album.dto.request.MemoUpdateRequest;
import com.ssafy.emour.album.dto.response.AlbumPhotoResponse;
import com.ssafy.emour.album.service.AlbumPhotoService;
import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 앨범 사진 API.  로그인(access 토큰) 필수.
 */
@RestController
@RequestMapping("/photos")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AlbumPhotoController {

    private final AlbumPhotoService albumPhotoService;

    /**
     * 사진 업로드 (메모 포함).  POST /photos
     * multipart/form-data 로 file(필수) + memo(선택) 를 받는다.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AlbumPhotoResponse>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "memo", required = false) String memo
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        AlbumPhotoResponse response = albumPhotoService.upload(userId, file, memo);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("사진이 업로드되었습니다.", response));
    }

    /**
     * 내 사진 전체 조회.  GET /photos
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AlbumPhotoResponse>>> getMyPhotos() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(albumPhotoService.getMyPhotos(userId)));
    }

    /**
     * 사진 삭제.  DELETE /photos/{photoId}
     */
    @DeleteMapping("/{photoId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long photoId) {
        Long userId = SecurityUtil.getCurrentUserId();
        albumPhotoService.delete(userId, photoId);
        return ResponseEntity.ok(ApiResponse.success("사진이 삭제되었습니다."));
    }

    /**
     * 사진 메모 작성/수정.  PATCH /photos/{photoId}/memo
     */
    @PatchMapping("/{photoId}/memo")
    public ResponseEntity<ApiResponse<AlbumPhotoResponse>> updateMemo(
            @PathVariable Long photoId,
            @Valid @RequestBody MemoUpdateRequest request
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success("메모가 저장되었습니다.",
                        albumPhotoService.updateMemo(userId, photoId, request.memo()))
        );
    }
}
