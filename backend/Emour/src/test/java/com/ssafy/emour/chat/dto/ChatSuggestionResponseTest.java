package com.ssafy.emour.chat.dto;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ChatSuggestionResponseTest {

    @ParameterizedTest
    @MethodSource("blockedReasons")
    void mapsBlockedReasonToGuideMessage(
            String blockReason,
            String expectedGuideMessage
    ) {
        AiSuggestionResponse aiResponse = new AiSuggestionResponse(
                "request-101",
                List.of(new AiSuggestionItem(
                        "gentle",
                        "부드럽게",
                        "AI가 반환한 문장"
                )),
                true,
                blockReason
        );

        ChatSuggestionResponse response =
                ChatSuggestionResponse.from(aiResponse);

        assertThat(response.blocked()).isTrue();
        assertThat(response.blockReason()).isEqualTo(blockReason);
        assertThat(response.suggestions()).isEmpty();
        assertThat(response.guideMessage()).isEqualTo(expectedGuideMessage);
    }

    private static Stream<Arguments> blockedReasons() {
        return Stream.of(
                Arguments.of(
                        "too_short",
                        "메시지가 너무 짧아 추천을 만들지 못했어요."
                ),
                Arguments.of(
                        "safety",
                        "민감한 내용이 감지되어 추천을 만들지 못했어요."
                ),
                Arguments.of(
                        "llm_failure",
                        "일시적인 오류로 추천을 만들지 못했어요. 잠시 후 다시 시도해 주세요."
                )
        );
    }
}
