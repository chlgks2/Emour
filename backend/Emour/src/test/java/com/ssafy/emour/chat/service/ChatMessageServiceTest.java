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
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

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

    @Mock
    private DashboardChangePublisher dashboardChangePublisher;

    @InjectMocks
    private ChatMessageService chatMessageService;

    // 텍스트 메시지를 저장하면 감정 분석 대기 데이터도 생성합니다.
    @Test
    void sendsTextMessage() {
        String clientMessageId = "7cc9768e-344a-4a96-b1b6-dfa93668ac6c";
        ChatMessageRequest request = new ChatMessageRequest(
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

        ChatMessageResponse response =
                chatMessageService.sendMessage(1L, 10L, request);

        assertThat(response.roomId()).isEqualTo(1L);
        assertThat(response.senderId()).isEqualTo(10L);
        assertThat(response.messageType()).isEqualTo(MessageType.TEXT);
        assertThat(response.content()).isEqualTo("안녕!");
        assertThat(response.images()).isEmpty();
        assertThat(response.sentAt()).isNotNull();
        verify(chatAnalysisRepository).save(any(ChatAnalysis.class));
    }

    // 사진 여러 장을 한 메시지에 입력한 순서대로 저장합니다.
    @Test
    void savesImagesInOrder() {
        String clientMessageId = "318b3db8-d3ce-4a76-99ab-748ad7069b19";
        ChatMessageRequest request = new ChatMessageRequest(
                clientMessageId,
                MessageType.IMAGE,
                null,
                List.of("https://image/1.jpg", "https://image/2.jpg")
        );

        allowActiveMember(10L, 1L);
        when(chatMessageRepository.findBySenderIdAndClientMessageId(
                10L,
                clientMessageId
        )).thenReturn(Optional.empty());
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ChatMessageResponse response =
                chatMessageService.sendMessage(1L, 10L, request);

        assertThat(response.images()).hasSize(2);
        assertThat(response.images().get(0).displayOrder()).isEqualTo(1);
        assertThat(response.images().get(1).displayOrder()).isEqualTo(2);
    }

    // 내용이 비어 있는 텍스트 메시지는 전송할 수 없습니다.
    @Test
    void rejectsBlankText() {
        ChatMessageRequest request = new ChatMessageRequest(
                "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                MessageType.TEXT,
                "   ",
                List.of()
        );

        assertThatThrownBy(() ->
                chatMessageService.sendMessage(1L, 10L, request))
                .isInstanceOf(ChatException.class)
                .hasMessage("텍스트 메시지 내용을 입력해 주세요.");
    }

    // 이미지 메시지에는 글을 함께 넣을 수 없습니다.
    @Test
    void rejectsImageText() {
        ChatMessageRequest request = new ChatMessageRequest(
                "318b3db8-d3ce-4a76-99ab-748ad7069b19",
                MessageType.IMAGE,
                "여행 사진",
                List.of("https://image/1.jpg")
        );

        assertThatThrownBy(() ->
                chatMessageService.sendMessage(1L, 10L, request))
                .isInstanceOf(ChatException.class)
                .hasMessage("IMAGE 메시지에는 텍스트 메시지를 넣을 수 없습니다.");
    }

    // 채팅방 멤버가 아닌 사용자의 메시지는 거절합니다.
    @Test
    void rejectsNonMember() {
        ChatMessageRequest request = new ChatMessageRequest(
                "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                MessageType.TEXT,
                "안녕",
                List.of()
        );

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(false);

        assertThatThrownBy(() ->
                chatMessageService.sendMessage(1L, 10L, request))
                .isInstanceOf(ChatException.class)
                .hasMessage("해당 채팅방에 참여 중인 사용자가 아닙니다.");
    }

    // 검색 위치에서 아래로 내리면 기준 번호보다 새로운 메시지를 시간 순서대로 반환합니다.
    @Test
    void returnsMessagesAfterCursor() {
        allowActiveMember(10L, 1L);
        when(chatMessageRepository
                .findByRoomIdAndMessageIdGreaterThanOrderByMessageIdAsc(
                        1L,
                        100L,
                        PageRequest.of(0, 3)
                )).thenReturn(List.of(
                        message(101L, "first"),
                        message(102L, "second"),
                        message(103L, "has next")
                ));
        when(chatAnalysisRepository.findByMessageMessageIdIn(any()))
                .thenReturn(List.of());

        var response = chatMessageService.getNewerMessages(
                1L,
                10L,
                100L,
                2
        );

        assertThat(response.messages())
                .extracting(ChatMessageResponse::messageId)
                .containsExactly(101L, 102L);
        assertThat(response.nextCursor()).isEqualTo(102L);
        assertThat(response.hasNext()).isTrue();
    }

    // 검색 결과를 누르면 선택한 메시지와 앞뒤 대화를 시간 순서대로 반환합니다.
    @Test
    void returnsContextAroundMessage() {
        ChatMessage target = message(100L, "target");
        when(chatMessageRepository.findByMessageId(100L))
                .thenReturn(Optional.of(target));
        allowActiveMember(10L, 1L);
        when(chatMessageRepository
                .findByRoomIdAndMessageIdLessThanOrderByMessageIdDesc(
                        1L,
                        100L,
                        PageRequest.of(0, 3)
                )).thenReturn(List.of(
                        message(99L, "before 1"),
                        message(98L, "before 2"),
                        message(97L, "has older")
                ));
        when(chatMessageRepository
                .findByRoomIdAndMessageIdGreaterThanOrderByMessageIdAsc(
                        1L,
                        100L,
                        PageRequest.of(0, 3)
                )).thenReturn(List.of(
                        message(101L, "after 1"),
                        message(102L, "after 2"),
                        message(103L, "has newer")
                ));
        when(chatAnalysisRepository.findByMessageMessageIdIn(any()))
                .thenReturn(List.of());

        var response = chatMessageService.getMessageContext(
                100L,
                10L,
                2,
                2
        );

        assertThat(response.messages())
                .extracting(ChatMessageResponse::messageId)
                .containsExactly(98L, 99L, 100L, 101L, 102L);
        assertThat(response.olderCursor()).isEqualTo(98L);
        assertThat(response.newerCursor()).isEqualTo(102L);
        assertThat(response.hasOlder()).isTrue();
        assertThat(response.hasNewer()).isTrue();
    }

    // DB에는 암호문이 저장되므로 검색은 조회한 메시지의 복호화된 내용을 비교합니다.
    @Test
    void searchesDecryptedMessageContent() {
        allowActiveMember(10L, 1L);
        when(chatMessageRepository.findByRoomIdOrderByMessageIdDesc(
                1L,
                PageRequest.of(0, 200)
        )).thenReturn(List.of(
                message(103L, "치킨 말고 피자"),
                message(102L, "오늘은 파스타"),
                message(101L, "치킨 먹을까?")
        ));
        when(chatAnalysisRepository.findByMessageMessageIdIn(any()))
                .thenReturn(List.of());

        var response = chatMessageService.searchMessages(
                1L,
                10L,
                "치킨",
                null,
                20
        );

        assertThat(response.messages())
                .extracting(ChatMessageResponse::messageId)
                .containsExactly(101L, 103L);
        assertThat(response.hasNext()).isFalse();
    }

    private void allowActiveMember(Long userId, Long roomId) {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    private ChatMessage message(Long messageId, String content) {
        ChatMessage message = ChatMessage.create(
                1L,
                10L,
                "00000000-0000-0000-0000-" + String.format("%012d", messageId),
                MessageType.TEXT,
                content
        );
        ReflectionTestUtils.setField(message, "messageId", messageId);
        return message;
    }
}
