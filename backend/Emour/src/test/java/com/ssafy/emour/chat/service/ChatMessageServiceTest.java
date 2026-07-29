package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatMessageRequest;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @InjectMocks
    private ChatMessageService chatMessageService;

    @Test
    void 텍스트_메시지를_저장하고_감정분석_대기를_만든다() {
        String clientMessageId = "7cc9768e-344a-4a96-b1b6-dfa93668ac6c";
        ChatMessageRequest request = new ChatMessageRequest(
                10L,
                clientMessageId,
                MessageType.TEXT,
                " 안녕! ",
                List.of()
        );

        allowActiveMember(10L, 1L);
        when(chatMessageRepository.findBySenderIdAndClientMessageId(
                10L,
                clientMessageId
        )).thenReturn(Optional.empty());
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(chatAnalysisRepository.save(any(ChatAnalysis.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ChatMessageResponse response = chatMessageService.sendMessage(1L, request);

        assertThat(response.roomId()).isEqualTo(1L);
        assertThat(response.senderId()).isEqualTo(10L);
        assertThat(response.messageType()).isEqualTo(MessageType.TEXT);
        assertThat(response.content()).isEqualTo("안녕!");
        assertThat(response.images()).isEmpty();
        assertThat(response.sentAt()).isNotNull();
        verify(chatAnalysisRepository).save(any(ChatAnalysis.class));
    }

    @Test
    void 이미지_메시지는_여러_이미지를_순서대로_저장한다() {
        String clientMessageId = "318b3db8-d3ce-4a76-99ab-748ad7069b19";
        ChatMessageRequest request = new ChatMessageRequest(
                10L,
                clientMessageId,
                MessageType.IMAGE,
                "여행 사진",
                List.of("https://image/1.jpg", "https://image/2.jpg")
        );

        allowActiveMember(10L, 1L);
        when(chatMessageRepository.findBySenderIdAndClientMessageId(
                10L,
                clientMessageId
        )).thenReturn(Optional.empty());
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ChatMessageResponse response = chatMessageService.sendMessage(1L, request);

        assertThat(response.images()).hasSize(2);
        assertThat(response.images().get(0).displayOrder()).isEqualTo(1);
        assertThat(response.images().get(1).displayOrder()).isEqualTo(2);
    }

    @Test
    void 빈_텍스트_메시지는_보낼_수_없다() {
        ChatMessageRequest request = new ChatMessageRequest(
                10L,
                "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                MessageType.TEXT,
                "   ",
                List.of()
        );

        assertThatThrownBy(() -> chatMessageService.sendMessage(1L, request))
                .isInstanceOf(ChatException.class)
                .hasMessage("텍스트 메시지 내용을 입력해 주세요.");
    }

    @Test
    void 채팅방_멤버가_아니면_메시지를_보낼_수_없다() {
        ChatMessageRequest request = new ChatMessageRequest(
                10L,
                "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                MessageType.TEXT,
                "안녕",
                List.of()
        );

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(false);

        assertThatThrownBy(() -> chatMessageService.sendMessage(1L, request))
                .isInstanceOf(ChatException.class)
                .hasMessage("해당 채팅방에 참여 중인 사용자가 아닙니다.");
    }

    private void allowActiveMember(Long userId, Long roomId) {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }
}
