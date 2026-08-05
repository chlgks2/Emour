package com.ssafy.emour.chat.dto;

import com.ssafy.emour.chat.entity.MessageType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 브라우저가 서버로 보내는 채팅 쪽지의 모양입니다.
 *
 * @param clientMessageId 중복 전송 방지를 위해 프론트에서 만든 UUID
 * @param messageType     TEXT 또는 IMAGE
 * @param content         텍스트 내용 또는 이미지 설명
 * @param imageUrls       미리 업로드를 마친 이미지 주소 목록
 */
public record ChatMessageRequest(
        @Schema(
                description = "중복 전송 방지용 UUID",
                example = "7cc9768e-344a-4a96-b1b6-dfa93668ac6c"
        )
        String clientMessageId,

        @Schema(description = "메시지 종류", example = "TEXT")
        MessageType messageType,

        @Schema(description = "텍스트 내용 또는 이미지 설명", example = "안녕!")
        String content,

        @Schema(
                description = "업로드가 끝난 이미지 URL 목록",
                example = "[\"https://image.example/1.jpg\"]"
        )
        List<String> imageUrls
) {
}
