package com.ssafy.emour.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Access Token 재발급 요청. 클라이언트가 보관 중인 Refresh Token 을 보낸다.
 */
public record TokenReissueRequest(

        @NotBlank(message = "refreshToken 은 필수입니다.")
        String refreshToken
) {
}
