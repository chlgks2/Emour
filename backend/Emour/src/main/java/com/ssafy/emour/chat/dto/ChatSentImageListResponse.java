package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "채팅으로 주고받은 사진 목록")
public record ChatSentImageListResponse(
        @Schema(description = "최신 사진부터 정렬된 목록")
        List<ChatSentImageResponse> images,

        @Schema(
                description = "더 오래된 사진을 조회할 때 beforeImageId로 보낼 값",
                example = "21"
        )
        Long nextCursor,

        @Schema(description = "더 오래된 사진이 남아 있는지 여부", example = "true")
        boolean hasNext
) {
}
