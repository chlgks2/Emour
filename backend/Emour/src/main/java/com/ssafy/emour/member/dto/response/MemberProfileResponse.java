package com.ssafy.emour.member.dto.response;

import com.ssafy.emour.member.entity.Member;

import java.time.LocalDate;

/**
 * 내 프로필 조회 응답. (비밀번호 등 민감정보는 제외)
 * DB엔 이미지 key만 있으므로, 응답 시 base-url을 붙여 전체 URL로 조립한다.
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
    public static MemberProfileResponse from(Member member, String baseUrl) {
        String imageUrl = (member.getProfileImageKey() == null)
                ? null
                : baseUrl + "/uploads/" + member.getProfileImageKey();
        return new MemberProfileResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getBirth(),
                imageUrl,
                member.getStatusMessage(),
                member.isEmailVerified()
        );
    }
}
