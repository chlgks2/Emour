package com.ssafy.emour.home.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.home.dto.request.HomeSettingUpdateRequest;
import com.ssafy.emour.home.dto.response.HomeSettingResponse;
import com.ssafy.emour.home.service.HomeSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/home/settings")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class HomeSettingController {

    private final HomeSettingService homeSettingService;

    @GetMapping
    @Operation(summary = "커플 공용 홈 설정 조회")
    public ResponseEntity<ApiResponse<HomeSettingResponse>> getSetting() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(homeSettingService.getSetting(userId))
        );
    }

    @PutMapping
    @Operation(summary = "커플 공용 홈 문구 및 스타일 저장")
    public ResponseEntity<ApiResponse<HomeSettingResponse>> updateSetting(
            @Valid @RequestBody HomeSettingUpdateRequest request
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(
                        "홈 설정이 저장되었습니다.",
                        homeSettingService.updateSetting(userId, request)
                )
        );
    }
}
