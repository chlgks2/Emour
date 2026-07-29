package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "채팅으로 주고받은 사진")
public record ChatSentImageResponse(
        @Schema(description = "사진 번호", example = "30")
        Long imageId,

        @Schema(description = "사진이 들어 있는 메시지 번호", example = "100")
        Long messageId,

        @Schema(description = "사진을 보낸 사용자 번호", example = "1")
        Long senderId,

        @Schema(description = "사진 URL", example = "https://image.example/1.jpg")
        String imageUrl,

        @Schema(description = "한 메시지 안에서 사진이 보이는 순서", example = "1")
        Integer displayOrder,

        @Schema(description = "사진 메시지를 보낸 시각")
        LocalDateTime sentAt
) {
}
