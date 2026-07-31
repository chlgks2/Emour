package com.ssafy.emour.calendar.controller;

import com.ssafy.emour.calendar.dto.request.DiaryCreateRequest;
import com.ssafy.emour.calendar.dto.request.DiaryUpdateRequest;
import com.ssafy.emour.calendar.dto.response.DiaryResponse;
import com.ssafy.emour.calendar.service.DiaryService;
import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/diaries")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class DiaryController {

    private final DiaryService diaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<DiaryResponse>> create(
            @Valid @RequestBody DiaryCreateRequest request
    ) {
        DiaryResponse response = diaryService.create(
                SecurityUtil.getCurrentUserId(),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("한줄 일기를 작성했습니다.", response));
    }

    @PatchMapping("/{diaryId}")
    public ResponseEntity<ApiResponse<DiaryResponse>> update(
            @PathVariable Long diaryId,
            @Valid @RequestBody DiaryUpdateRequest request
    ) {
        DiaryResponse response = diaryService.update(
                SecurityUtil.getCurrentUserId(),
                diaryId,
                request
        );
        return ResponseEntity.ok(
                ApiResponse.success("한줄 일기를 수정했습니다.", response)
        );
    }

    @DeleteMapping("/{diaryId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long diaryId
    ) {
        diaryService.delete(
                SecurityUtil.getCurrentUserId(),
                diaryId
        );
        return ResponseEntity.ok(
                ApiResponse.success("한줄 일기를 삭제했습니다.", null)
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DiaryResponse>>> getAll() {
        List<DiaryResponse> response = diaryService.getAll(
                SecurityUtil.getCurrentUserId()
        );
        return ResponseEntity.ok(
                ApiResponse.success("나의 한줄 일기 목록을 조회했습니다.", response)
        );
    }
}
