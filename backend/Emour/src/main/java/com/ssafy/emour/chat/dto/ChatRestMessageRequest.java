package com.ssafy.emour.chat.dto;

import com.ssafy.emour.chat.entity.MessageType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * REST로 메시지를 보낼 때 사용하는 요청입니다.
 * WebSocket은 주소에 roomId가 있지만 REST는 본문에 roomId를 넣습니다.
 */
public record ChatRestMessageRequest(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(
                description = "중복 전송 방지용 UUID",
                example = "7cc9768e-344a-4a96-b1b6-dfa93668ac6c"
        )
        String clientMessageId,

        @Schema(description = "메시지 종류", example = "TEXT")
        MessageType messageType,

        @Schema(description = "텍스트 내용 또는 이미지 설명", example = "안녕!")
        String content,

        @Schema(description = "업로드가 끝난 이미지 URL 목록")
        List<String> imageUrls
) {
    public ChatMessageRequest toMessageRequest() {
        return new ChatMessageRequest(
                clientMessageId,
                messageType,
                content,
                imageUrls
        );
    }
}
