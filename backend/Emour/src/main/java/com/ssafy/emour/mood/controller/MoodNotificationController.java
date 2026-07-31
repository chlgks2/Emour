package com.ssafy.emour.mood.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.mood.dto.request.MoodNotificationUpdateRequest;
import com.ssafy.emour.mood.dto.response.MoodNotificationResponse;
import com.ssafy.emour.mood.service.MoodNotificationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/me/mood-notification-setting")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class MoodNotificationController {

    private final MoodNotificationService moodNotificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<MoodNotificationResponse>> get() {
        MoodNotificationResponse response = moodNotificationService.get(
                SecurityUtil.getCurrentUserId()
        );
        return ResponseEntity.ok(
                ApiResponse.success("MOOD 알림 설정을 조회했습니다.", response)
        );
    }

    @PutMapping
    public ResponseEntity<ApiResponse<MoodNotificationResponse>> update(
            @Valid @RequestBody MoodNotificationUpdateRequest request
    ) {
        MoodNotificationResponse response = moodNotificationService.update(
                SecurityUtil.getCurrentUserId(),
                request
        );
        return ResponseEntity.ok(
                ApiResponse.success("MOOD 알림 설정을 저장했습니다.", response)
        );
    }
}
