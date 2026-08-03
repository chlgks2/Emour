package com.ssafy.emour.member.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "상대방에게 표시할 닉네임")
public record PartnerNicknameResponse(
        @Schema(description = "상대방 회원 번호", example = "22")
        Long partnerUserId,

        @Schema(
                description = "사용자 지정 애칭 또는 상대방의 회원 닉네임",
                example = "내 사랑"
        )
        String partnerNickname,

        @Schema(description = "사용자가 별도로 애칭을 등록했는지 여부")
        boolean customized
) {
}
