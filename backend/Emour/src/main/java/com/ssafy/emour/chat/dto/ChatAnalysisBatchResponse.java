package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "채팅 감정 분석 실행 결과")
public record ChatAnalysisBatchResponse(
        @Schema(description = "커플 방 번호", example = "1")
        Long roomId,

        @Schema(description = "분석 완료한 메시지 개수", example = "3")
        int analyzedCount,

        @Schema(
                description = "메시지 번호별 저장된 영문 감정",
                example = "{\"101\":\"JOY\",\"102\":\"NEUTRAL\"}"
        )
        Map<Long, String> emotions
) {
}
