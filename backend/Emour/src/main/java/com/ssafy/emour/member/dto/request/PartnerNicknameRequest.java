package com.ssafy.emour.member.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "상대방 애칭 등록 요청")
public record PartnerNicknameRequest(
        @NotBlank(message = "상대방 애칭을 입력해 주세요.")
        @Size(max = 20, message = "상대방 애칭은 20자 이하여야 합니다.")
        @Schema(description = "내가 상대방에게 붙일 애칭", example = "내 사랑")
        String partnerNickname
) {
}
