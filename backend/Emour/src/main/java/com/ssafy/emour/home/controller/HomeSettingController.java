package com.ssafy.emour.home.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.home.dto.response.HomeSettingResponse;
import com.ssafy.emour.home.service.HomeSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
