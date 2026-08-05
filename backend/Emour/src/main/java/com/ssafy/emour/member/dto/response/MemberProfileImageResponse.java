package com.ssafy.emour.member.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "회원 프로필 이미지")
public record MemberProfileImageResponse(
        @Schema(
                description = "회원 번호. 커플 연결 전에는 상대방 번호가 null입니다.",
                example = "21",
                nullable = true
        )
        Long userId,

        @Schema(
                description = "프로필 이미지 주소. 등록된 이미지가 없으면 null입니다.",
                example = "https://example.com/profiles/user.png",
                nullable = true
        )
        String profileImageUrl
) {
}
