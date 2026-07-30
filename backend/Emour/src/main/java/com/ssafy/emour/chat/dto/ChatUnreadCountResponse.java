package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "안 읽은 채팅 메시지 개수")
public record ChatUnreadCountResponse(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "조회한 사용자 번호", example = "1")
        Long userId,

        @Schema(
                description = "마지막으로 읽은 메시지 번호, 한 번도 읽지 않았다면 null",
                example = "100"
        )
        Long lastReadMessageId,

        @Schema(description = "상대방이 보낸 안 읽은 메시지 개수", example = "3")
        long unreadCount
) {
}
