package com.ssafy.emour.auth.service;

/**
 * 구글 ID 토큰에서 검증·추출한 사용자 정보.
 */
public record GoogleUserInfo(
        String email,
        String name,
        String picture,
        boolean emailVerified
) {
}
