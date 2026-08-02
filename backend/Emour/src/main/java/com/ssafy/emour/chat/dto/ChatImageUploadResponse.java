package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "채팅 이미지 업로드 결과")
public record ChatImageUploadResponse(
        @Schema(
                description = "업로드된 순서대로 생성된 이미지 URL 목록",
                example = "[\"/uploads/2026/08/03/image-1.jpg\"]"
        )
        List<String> imageUrls
) {
}
