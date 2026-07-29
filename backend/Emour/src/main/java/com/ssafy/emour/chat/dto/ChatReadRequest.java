package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record ChatReadRequest(
        @Schema(description = "마지막으로 읽은 메시지 번호", example = "100")
        Long lastReadMessageId
) {
}
