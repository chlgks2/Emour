package com.ssafy.emour.member.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.member.dto.request.PasswordChangeRequest;
import com.ssafy.emour.member.dto.request.ProfileUpdateRequest;
import com.ssafy.emour.member.dto.response.MemberProfileImageResponse;
import com.ssafy.emour.member.dto.response.MemberProfileResponse;
import com.ssafy.emour.member.dto.response.MemberProfileImagesResponse;
import com.ssafy.emour.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 회원(마이페이지) API.  모든 경로는 로그인(access 토큰) 필수.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class MemberController {

    private final MemberService memberService;

    /** 내 프로필 조회.  GET /users/me */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MemberProfileResponse>> getMyProfile() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(memberService.getMyProfile(userId))
        );
    }

    @GetMapping("/me/profile-img")
    @Operation(
            summary = "내 프로필 이미지 조회",
            description = "JWT로 로그인한 사용자의 프로필 이미지 주소만 반환합니다."
    )
    public ResponseEntity<ApiResponse<MemberProfileImageResponse>>
    getMyProfileImage() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(
                        memberService.getMyProfileImage(userId)
                )
        );
    }

    @GetMapping("/partner/profile-img")
    @Operation(
            summary = "상대방 프로필 이미지 조회",
            description = """
                    현재 연결된 커플 상대방의 사용자 번호와 프로필 이미지 주소를 반환합니다.
                    커플 연결 전이면 두 값 모두 null입니다.
                    """
    )
    public ResponseEntity<ApiResponse<MemberProfileImageResponse>>
    getPartnerProfileImage() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(
                        memberService.getPartnerProfileImage(userId)
                )
        );
    }

    /** 내 프로필 수정.  PATCH /users/me */
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<MemberProfileResponse>> updateProfile(
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success("프로필이 수정되었습니다.", memberService.updateProfile(userId, request))
        );
    }

    /** 비밀번호 변경.  PATCH /users/me/password */
    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        memberService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다."));
    }

    /** 회원 탈퇴.  DELETE /users/me */
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> withdraw() {
        Long userId = SecurityUtil.getCurrentUserId();
        memberService.withdraw(userId);
        return ResponseEntity.ok(ApiResponse.success("회원 탈퇴가 완료되었습니다."));
    }

    @GetMapping("/profile-img")
    @Operation(
            summary = "나와 상대방 프로필 이미지 조회",
            description = """
                    로그인한 사용자와 현재 연결된 커플 상대방의 프로필 이미지 주소를 반환합니다.
                    커플 연결 전이거나 상대방 이미지가 없으면 해당 값은 null입니다.
                    """
    )
    public ResponseEntity<ApiResponse<MemberProfileImagesResponse>>
    getProfileImages() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(
                        memberService.getProfileImages(userId)
                )
        );
    }
}
