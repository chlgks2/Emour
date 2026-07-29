package com.ssafy.emour.auth.dto.response;

/**
 * 토큰 재발급 응답. 새로 발급된 Access Token 을 담는다.
 */
public record TokenResponse(
        String tokenType,
        String accessToken
) {
    public static TokenResponse ofAccessToken(String accessToken) {
        return new TokenResponse("Bearer", accessToken);
    }
}
