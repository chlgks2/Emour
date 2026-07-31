package com.ssafy.emour.couple.controller;

import com.ssafy.emour.couple.dto.request.CoupleConnectRequest;
import com.ssafy.emour.couple.dto.response.CoupleConnectResponse;
import com.ssafy.emour.couple.dto.response.CoupleDisconnectResponse;
import com.ssafy.emour.couple.dto.response.CoupleInvitationResponse;
import com.ssafy.emour.couple.dto.response.CoupleRoomIdResponse;
import com.ssafy.emour.couple.dto.response.CoupleStatusResponse;
import com.ssafy.emour.couple.service.CoupleService;
import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/couples")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CoupleController {

    private final CoupleService coupleService;

    @GetMapping("/room-id")
    public ResponseEntity<ApiResponse<CoupleRoomIdResponse>> getCurrentRoomId() {
        Long roomId = coupleService.getCurrentRoomId(
                SecurityUtil.getCurrentUserId()
        );
        return ResponseEntity.ok(
                ApiResponse.success(
                        "현재 커플방을 조회했습니다.",
                        new CoupleRoomIdResponse(roomId)
                )
        );
    }

    @PostMapping("/invitation")
    public ResponseEntity<ApiResponse<CoupleInvitationResponse>> createInvitation() {
        CoupleInvitationResponse response = coupleService.createInvitation(
                SecurityUtil.getCurrentUserId()
        );
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("커플 초대 코드가 생성되었습니다.", response));
    }

    @PostMapping("/connect")
    public ResponseEntity<ApiResponse<CoupleConnectResponse>> connect(
            @Valid @RequestBody CoupleConnectRequest request
    ) {
        CoupleConnectResponse response = coupleService.connect(
                SecurityUtil.getCurrentUserId(),
                request
        );
        return ResponseEntity.ok(
                ApiResponse.success("커플 연결이 완료되었습니다.", response)
        );
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<CoupleStatusResponse>> getStatus() {
        CoupleStatusResponse response = coupleService.getStatus(
                SecurityUtil.getCurrentUserId()
        );
        return ResponseEntity.ok(
                ApiResponse.success("커플 연결 상태를 조회했습니다.", response)
        );
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<CoupleDisconnectResponse>> disconnect() {
        CoupleDisconnectResponse response = coupleService.disconnect(
                SecurityUtil.getCurrentUserId()
        );
        return ResponseEntity.ok(
                ApiResponse.success("커플 연결이 해제되었습니다.", response)
        );
    }
}
