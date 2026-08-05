package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "저장한 채팅 메시지 목록")
public record ChatBookmarkListResponse(
        @Schema(description = "북마크 목록")
        List<ChatBookmarkResponse> bookmarks,

        @Schema(
                description = "다음 목록을 조회할 때 사용할 북마크 번호",
                example = "10"
        )
        Long nextCursor,

        @Schema(description = "더 과거의 북마크가 있는지 여부", example = "true")
        boolean hasNext
) {
}
