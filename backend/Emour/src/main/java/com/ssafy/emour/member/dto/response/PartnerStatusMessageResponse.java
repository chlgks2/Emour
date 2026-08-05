package com.ssafy.emour.member.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "상대방 상태 메시지")
public record PartnerStatusMessageResponse(
        @Schema(description = "상대방 회원 번호", example = "22")
        Long partnerUserId,

        @Schema(
                description = "상대방이 등록한 상태 메시지. 등록하지 않았으면 null입니다.",
                example = "오늘도 좋은 하루!",
                nullable = true
        )
        String statusMessage
) {
}
