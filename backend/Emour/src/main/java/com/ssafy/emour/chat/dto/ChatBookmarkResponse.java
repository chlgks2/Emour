package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "저장한 채팅 메시지")
public record ChatBookmarkResponse(
        @Schema(description = "북마크 번호", example = "10")
        Long bookmarkId,

        @Schema(description = "북마크한 시각")
        LocalDateTime bookmarkedAt,

        @Schema(description = "북마크한 메시지")
        ChatMessageResponse message
) {
}
