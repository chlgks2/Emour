package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ChatSuggestionResponse(
        List<AiSuggestionItem> suggestions,

        boolean blocked,

        @JsonProperty("block_reason")
        String blockReason,

        @JsonProperty("guide_message")
        String guideMessage
) {

    public static ChatSuggestionResponse from(AiSuggestionResponse response) {
        if (!response.blocked()) {
            return new ChatSuggestionResponse(
                    response.suggestions(),
                    false,
                    response.blockReason(),
                    null
            );
        }

        return new ChatSuggestionResponse(
                List.of(),
                true,
                response.blockReason(),
                blockedGuideMessage(response.blockReason())
        );
    }

    private static String blockedGuideMessage(String blockReason) {
        if (blockReason == null) {
            return "추천을 만들지 못했어요.";
        }

        return switch (blockReason) {
            case "too_short" -> "메시지가 너무 짧아 추천을 만들지 못했어요.";
            case "safety" -> "민감한 내용이 감지되어 추천을 만들지 못했어요.";
            case "llm_failure" -> "일시적인 오류로 추천을 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
            default -> "추천을 만들지 못했어요.";
        };
    }
}
