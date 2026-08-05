package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiSuggestionItem;
import com.ssafy.emour.chat.dto.AiSuggestionRequest;
import com.ssafy.emour.chat.dto.AiSuggestionResponse;
import com.ssafy.emour.chat.dto.ChatSuggestionRequest;
import com.ssafy.emour.chat.dto.ChatSuggestionResponse;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatSuggestionServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;
    @Mock
    private AiSuggestionClient aiSuggestionClient;

    @Test
    void sendsOldestHistoryFirst() {
        ChatMessage target = targetMessage();
        ChatMessage older = historyMessage(22L, "먼저 보낸 말");
        ChatMessage newer = historyMessage(21L, "나중에 보낸 말");
        ChatSuggestionService service = service();

        allowUser(target);
        when(chatMessageRepository.findRecentTextMessagesBefore(
                1L,
                101L,
                PageRequest.of(0, 12)
        )).thenReturn(List.of(newer, older));
        when(aiSuggestionClient.suggest(org.mockito.ArgumentMatchers.any()))
                .thenReturn(response(false));

        service.suggest(
                21L,
                new ChatSuggestionRequest(101L, " 오늘 만날래? ")
        );

        ArgumentCaptor<AiSuggestionRequest> captor =
                ArgumentCaptor.forClass(AiSuggestionRequest.class);
        verify(aiSuggestionClient).suggest(captor.capture());
        AiSuggestionRequest request = captor.getValue();
        assertThat(request.messageId()).isEqualTo("101");
        assertThat(request.speakerId()).isEqualTo("21");
        assertThat(request.targetMessage()).isEqualTo("오늘 만날래?");
        assertThat(request.history())
                .extracting(history -> history.text())
                .containsExactly("먼저 보낸 말", "나중에 보낸 말");
    }

    @Test
    void removesSuggestionsWhenBlocked() {
        ChatMessage target = targetMessage();
        ChatSuggestionService service = service();

        allowUser(target);
        when(chatMessageRepository.findRecentTextMessagesBefore(
                1L,
                101L,
                PageRequest.of(0, 12)
        )).thenReturn(List.of());
        when(aiSuggestionClient.suggest(org.mockito.ArgumentMatchers.any()))
                .thenReturn(response(true));

        ChatSuggestionResponse result = service.suggest(
                21L,
                new ChatSuggestionRequest(101L, "문장")
        );

        assertThat(result.blocked()).isTrue();
        assertThat(result.blockReason()).isEqualTo("safety");
        assertThat(result.guideMessage())
                .isEqualTo("민감한 내용이 감지되어 추천을 만들지 못했어요.");
        assertThat(result.suggestions()).isEmpty();
    }

    private ChatSuggestionService service() {
        return new ChatSuggestionService(
                chatMessageRepository,
                coupleMemberRepository,
                aiSuggestionClient
        );
    }

    private void allowUser(ChatMessage target) {
        when(chatMessageRepository.findByMessageId(101L))
                .thenReturn(Optional.of(target));
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(21L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    private ChatMessage targetMessage() {
        ChatMessage message = mock(ChatMessage.class);
        when(message.getMessageId()).thenReturn(101L);
        when(message.getRoomId()).thenReturn(1L);
        when(message.getSenderId()).thenReturn(21L);
        return message;
    }

    private ChatMessage historyMessage(Long senderId, String content) {
        ChatMessage message = mock(ChatMessage.class);
        when(message.getSenderId()).thenReturn(senderId);
        when(message.getContent()).thenReturn(content);
        return message;
    }

    private AiSuggestionResponse response(boolean blocked) {
        return new AiSuggestionResponse(
                "101",
                List.of(new AiSuggestionItem(
                        "gentle",
                        "상냥하게",
                        "추천 문장"
                )),
                blocked,
                blocked ? "safety" : null
        );
    }
}
