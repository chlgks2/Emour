package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "채팅 읽음 상태")
public record ChatReadResponse(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "읽은 사용자 번호", example = "1")
        Long userId,

        @Schema(description = "마지막으로 읽은 메시지 번호", example = "100")
        Long lastReadMessageId,

        @Schema(description = "읽음 상태가 갱신된 시각")
        LocalDateTime readAt
) {
}
