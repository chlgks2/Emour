package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "WebSocket으로 전달하는 공감 변경 이벤트")
public record ChatReactionEventResponse(
        @Schema(
                description = "공감 추가·변경은 UPSERTED, 취소는 REMOVED",
                example = "UPSERTED"
        )
        String action,

        @Schema(description = "추가·변경·취소된 공감")
        ChatReactionResponse reaction
) {
}
