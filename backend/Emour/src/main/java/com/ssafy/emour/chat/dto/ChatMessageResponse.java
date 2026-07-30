package com.ssafy.emour.chat.dto;

import com.ssafy.emour.chat.entity.MessageType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 서버가 채팅방 사람들에게 나눠 주는 채팅 쪽지의 모양입니다.
 */
@Schema(description = "저장된 채팅 메시지")
public record ChatMessageResponse(
        @Schema(description = "서버가 만든 메시지 번호", example = "100")
        Long messageId,

        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "보낸 사용자 번호", example = "1")
        Long senderId,

        @Schema(
                description = "프론트가 만든 중복 방지 UUID",
                example = "7cc9768e-344a-4a96-b1b6-dfa93668ac6c"
        )
        String clientMessageId,

        @Schema(description = "메시지 종류", example = "TEXT")
        MessageType messageType,

        @Schema(description = "텍스트 내용 또는 이미지 설명", example = "안녕!")
        String content,

        @Schema(description = "메시지에 연결된 이미지 목록")
        List<ChatImageResponse> images,

        @Schema(description = "메시지에 남겨진 공감 목록")
        List<ChatReactionResponse> reactions,

        @Schema(description = "서버 저장 시각")
        LocalDateTime sentAt
) {
}
