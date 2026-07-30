package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "메시지 공감 요청")
public record ChatReactionRequest(
        @Schema(
                description = "공감 종류. 새로운 종류도 문자열로 추가할 수 있습니다.",
                example = "HEART"
        )
        String reactionType
) {
}
