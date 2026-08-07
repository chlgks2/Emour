package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "기준 메시지 이후의 채팅 조회 결과")
public record ChatNewerHistoryResponse(
        @Schema(description = "오래된 메시지부터 정렬된 채팅 목록")
        List<ChatMessageResponse> messages,

        @Schema(
                description = "더 새로운 메시지를 조회할 때 afterMessageId로 보낼 값",
                example = "150"
        )
        Long nextCursor,

        @Schema(description = "더 새로운 메시지가 남아 있는지 여부")
        boolean hasNext
) {
}
