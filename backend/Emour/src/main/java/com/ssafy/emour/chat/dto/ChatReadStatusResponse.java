package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "상대방의 채팅 읽음 상태")
public record ChatReadStatusResponse(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(
                description = "상대방이 마지막으로 읽은 메시지 번호, 한 번도 읽지 않았다면 null",
                example = "100"
        )
        Long partnerLastReadMessageId,

        @Schema(description = "상대방의 읽음 상태가 마지막으로 갱신된 시각")
        LocalDateTime partnerReadAt
) {
}
