package com.ssafy.emour.auth.dto.response;

import com.ssafy.emour.member.entity.Member;

/**
 * 회원가입 결과로 클라이언트에게 돌려줄 데이터.
 * (비밀번호 등 민감정보는 절대 담지 않는다 — 필요한 것만 골라 담는다.)
 */
public record SignUpResponse(
        Long userId,
        String email,
        String nickname
) {
    // Member 엔티티 → 응답 DTO 변환용 정적 팩토리 메서드
    public static SignUpResponse from(Member member) {
        return new SignUpResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname()
        );
    }
}
