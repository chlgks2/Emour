package com.ssafy.emour.auth.dto.response;

import com.ssafy.emour.member.entity.Member;

/**
 * 로그인 성공 시 응답 데이터.
 * 발급된 토큰 2종 + 최소한의 회원 정보를 담는다.
 *
 * tokenType "Bearer" : 클라이언트가 Authorization 헤더에 넣을 때
 *   "Authorization: Bearer {accessToken}" 형식으로 쓰라는 표준 표기.
 */
public record LoginResponse(
        Long userId,
        String nickname,
        String tokenType,
        String accessToken,
        String refreshToken
) {
    public static LoginResponse of(Member member, String accessToken, String refreshToken) {
        return new LoginResponse(
                member.getId(),
                member.getNickname(),
                "Bearer",
                accessToken,
                refreshToken
        );
    }
}
