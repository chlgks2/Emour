package com.ssafy.emour.mood.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.mood.dto.request.MoodCreateRequest;
import com.ssafy.emour.mood.dto.response.MoodCreateResponse;
import com.ssafy.emour.mood.service.MoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/moods")
@RequiredArgsConstructor
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
}
