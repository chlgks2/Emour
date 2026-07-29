package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "채팅 메시지에 포함된 이미지")
public record ChatImageResponse(
        @Schema(description = "이미지 번호", example = "10")
        Long imageId,

        @Schema(description = "이미지 URL", example = "https://image.example/1.jpg")
        String imageUrl,

        @Schema(description = "메시지 안에서 표시할 순서", example = "1")
        Integer displayOrder
) {
}
