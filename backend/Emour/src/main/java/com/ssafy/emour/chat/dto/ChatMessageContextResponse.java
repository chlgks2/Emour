package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "검색한 메시지와 그 주변 채팅 조회 결과")
public record ChatMessageContextResponse(
        @Schema(description = "화면 중앙으로 이동할 메시지 번호", example = "100")
        Long targetMessageId,

        @Schema(description = "검색 메시지를 포함해 오래된 순서로 정렬된 주변 채팅")
        List<ChatMessageResponse> messages,

        @Schema(description = "더 과거 메시지를 조회할 때 beforeMessageId로 보낼 값")
        Long olderCursor,

        @Schema(description = "더 새로운 메시지를 조회할 때 afterMessageId로 보낼 값")
        Long newerCursor,

        @Schema(description = "더 과거 메시지가 남아 있는지 여부")
        boolean hasOlder,

        @Schema(description = "더 새로운 메시지가 남아 있는지 여부")
        boolean hasNewer
) {
}
