package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 이전 채팅 목록과 다음 페이지를 찾을 커서를 함께 돌려줍니다.
 */
@Schema(description = "이전 채팅 조회 결과")
public record ChatHistoryResponse(
        @Schema(description = "오래된 메시지부터 정렬된 채팅 목록")
        List<ChatMessageResponse> messages,

        @Schema(
                description = "더 과거 메시지를 조회할 때 beforeMessageId로 보낼 값",
                example = "51"
        )
        Long nextCursor,

        @Schema(description = "더 과거 메시지가 남아 있는지 여부", example = "true")
        boolean hasNext
) {
}
