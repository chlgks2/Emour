package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "메시지에 저장된 공감")
public record ChatReactionResponse(
        @Schema(description = "공감 번호", example = "10")
        Long reactionId,

        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "메시지 번호", example = "100")
        Long messageId,

        @Schema(description = "공감한 사용자 번호", example = "2")
        Long userId,

        @Schema(description = "공감 종류", example = "HEART")
        String reactionType,

        @Schema(description = "처음 공감한 시각")
        LocalDateTime createdAt,

        @Schema(description = "공감 종류를 마지막으로 변경한 시각")
        LocalDateTime updatedAt
) {
}
