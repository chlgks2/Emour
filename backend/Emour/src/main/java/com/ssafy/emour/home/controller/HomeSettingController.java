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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.Parameter;

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

    @PostMapping(
            value = "/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Operation(summary = "커플 공용 홈 이미지 업로드")
    public ResponseEntity<ApiResponse<HomeSettingResponse>> uploadImage(
            @Parameter(description = "업로드할 홈 이미지", required = true)
            @RequestPart("file") MultipartFile file
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "홈 이미지가 저장되었습니다.",
                        homeSettingService.uploadImage(userId, file)
                ));
    }
}
