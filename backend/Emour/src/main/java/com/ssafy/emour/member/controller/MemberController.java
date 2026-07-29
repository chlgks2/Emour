package com.ssafy.emour.member.controller;

import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import com.ssafy.emour.member.dto.response.MemberProfileResponse;
import com.ssafy.emour.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 회원(마이페이지) API.  모든 경로는 로그인(access 토큰) 필수.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    /**
     * 내 프로필 조회.  GET /users/me
     * 토큰에서 꺼낸 "현재 로그인한 회원"의 정보를 반환한다.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MemberProfileResponse>> getMyProfile() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(
                ApiResponse.success(memberService.getMyProfile(userId))
        );
    }
}
