package com.ssafy.emour.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 구글 로그인 요청.
 *
 * 프론트가 구글 로그인(Google Identity Services)으로 발급받은 ID 토큰(JWT)을 보낸다.
 * 백엔드는 이 토큰을 구글에 검증한 뒤, 우리 서비스의 JWT(access/refresh)를 발급한다.
 */
public record GoogleLoginRequest(

        @NotBlank(message = "구글 ID 토큰은 필수입니다.")
        String idToken
) {
}
