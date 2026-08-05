package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "커플 구성원 한 명의 감정 흐름")
public record MemberEmotionFlow(
        @Schema(description = "사용자 번호", example = "10")
        Long userId,

        @Schema(description = "분석 완료된 메시지 개수", example = "18")
        int analyzedMessageCount,

        @Schema(description = "2시간 단위 감정 흐름 12개 구간")
        List<EmotionFlowSlot> flow
) {
    public static MemberEmotionFlow from(
            DashboardEmotionFlowResponse response
    ) {
        return new MemberEmotionFlow(
                response.userId(),
                response.analyzedMessageCount(),
                response.flow()
        );
    }
}
