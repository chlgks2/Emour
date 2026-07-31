package com.ssafy.emour.mood.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.mood.dto.request.MoodCreateRequest;
import com.ssafy.emour.mood.dto.request.MoodUpdateRequest;
import com.ssafy.emour.mood.dto.response.MoodCreateResponse;
import com.ssafy.emour.mood.dto.response.MoodResponse;
import com.ssafy.emour.mood.dto.response.MoodUpdateResponse;
import com.ssafy.emour.mood.service.MoodService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/moods")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class MoodController {

    private final MoodService moodService;

    @PostMapping
    public ResponseEntity<ApiResponse<MoodCreateResponse>> create(
            @Valid @RequestBody MoodCreateRequest request
    ) {
        MoodCreateResponse response = moodService.create(
                SecurityUtil.getCurrentUserId(),
                request
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("기분이 등록되었습니다.", response));
    }

    @PatchMapping("/{moodId}")
    public ResponseEntity<ApiResponse<MoodUpdateResponse>> update(
            @PathVariable Long moodId,
            @Valid @RequestBody MoodUpdateRequest request
    ) {
        MoodUpdateResponse response = moodService.update(
                SecurityUtil.getCurrentUserId(),
                moodId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success("기분을 수정했습니다.", response)
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MoodResponse>>> getAll() {
        List<MoodResponse> response = moodService.getAll(
                SecurityUtil.getCurrentUserId()
        );

        return ResponseEntity.ok(
                ApiResponse.success("기분 기록을 조회했습니다.", response)
        );
    }
}
