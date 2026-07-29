package com.ssafy.emour.member.dto.response;

import com.ssafy.emour.member.entity.Member;

import java.time.LocalDate;

/**
 * 내 프로필 조회 응답. (비밀번호 등 민감정보는 제외)
 */
public record MemberProfileResponse(
        Long userId,
        String email,
        String nickname,
        LocalDate birth,
        String profileImageUrl,
        String statusMessage,
        boolean emailVerified
) {
    public static MemberProfileResponse from(Member member) {
        return new MemberProfileResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getBirth(),
                member.getProfileImageUrl(),
                member.getStatusMessage(),
                member.isEmailVerified()
        );
    }
}
