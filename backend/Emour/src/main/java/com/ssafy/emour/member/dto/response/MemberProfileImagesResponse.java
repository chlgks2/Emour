package com.ssafy.emour.member.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "나와 커플 상대방의 프로필 이미지")
public record MemberProfileImagesResponse(
        @Schema(description = "로그인한 사용자 번호", example = "21")
        Long myUserId,

        @Schema(
                description = "로그인한 사용자의 프로필 이미지 주소",
                example = "https://example.com/profiles/me.png",
                nullable = true
        )
        String myProfileImageUrl,

        @Schema(
                description = "활성 커플 상대방 번호. 연결 전이면 null",
                example = "22",
                nullable = true
        )
        Long partnerUserId,

        @Schema(
                description = "활성 커플 상대방의 프로필 이미지 주소. 연결 전이면 null",
                example = "https://example.com/profiles/partner.png",
                nullable = true
        )
        String partnerProfileImageUrl
) {
}
