package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatReadRequest;
import com.ssafy.emour.chat.dto.ChatReadResponse;
import com.ssafy.emour.chat.dto.ChatReadStatusResponse;
import com.ssafy.emour.chat.dto.ChatUnreadCountResponse;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.ChatReadState;
import com.ssafy.emour.chat.entity.ChatReadStateId;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.repository.ChatReadStateRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatReadServiceTest {

    @Mock
    private ChatReadStateRepository chatReadStateRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private ChatMessageService chatMessageService;

    @InjectMocks
    private ChatReadService chatReadService;

    // 사용자가 마지막으로 읽은 메시지 위치를 저장합니다.
    @Test
    void savesReadPosition() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatMessageService.findMessageInRoom(100L, 1L))
                .thenReturn(ChatMessage.create(
                        1L,
                        20L,
                        "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                        MessageType.TEXT,
                        "안녕"
                ));
        when(chatReadStateRepository.findById(
                new ChatReadStateId(10L, 1L)
        )).thenReturn(Optional.empty());
        when(chatReadStateRepository.save(any(ChatReadState.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ChatReadResponse response = chatReadService.markAsRead(
                1L,
                10L,
                new ChatReadRequest(100L)
        );

        assertThat(response.roomId()).isEqualTo(1L);
        assertThat(response.userId()).isEqualTo(10L);
        assertThat(response.lastReadMessageId()).isEqualTo(100L);
        assertThat(response.readAt()).isNotNull();
    }

    // 읽은 기록이 없으면 상대방 메시지를 모두 안 읽은 것으로 계산합니다.
    @Test
    void countsAllUnreadMessages() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatReadStateRepository.findById(
                new ChatReadStateId(10L, 1L)
        )).thenReturn(Optional.empty());
        when(chatMessageRepository
                .countByRoomIdAndSenderIdNot(1L, 10L))
                .thenReturn(3L);

        ChatUnreadCountResponse response =
                chatReadService.getUnreadCount(1L, 10L);

        assertThat(response.lastReadMessageId()).isNull();
        assertThat(response.unreadCount()).isEqualTo(3L);
    }

    // 마지막으로 읽은 위치 뒤의 상대방 메시지만 계산합니다.
    @Test
    void countsUnreadAfterLastRead() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        ChatReadState state = ChatReadState.first(10L, 1L, 100L);
        when(chatReadStateRepository.findById(
                new ChatReadStateId(10L, 1L)
        )).thenReturn(Optional.of(state));
        when(chatMessageRepository
                .countByRoomIdAndSenderIdNotAndMessageIdGreaterThan(
                        1L,
                        10L,
                        100L
                ))
                .thenReturn(2L);

        ChatUnreadCountResponse response =
                chatReadService.getUnreadCount(1L, 10L);

        assertThat(response.lastReadMessageId()).isEqualTo(100L);
        assertThat(response.unreadCount()).isEqualTo(2L);
    }

    // 상대방이 마지막으로 읽은 메시지 위치를 조회합니다.
    @Test
    void getsPartnerReadStatus() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        ChatReadState partnerState = ChatReadState.first(20L, 1L, 100L);
        when(chatReadStateRepository.findPartnerReadState(1L, 10L))
                .thenReturn(Optional.of(partnerState));

        ChatReadStatusResponse response =
                chatReadService.getPartnerReadStatus(1L, 10L);

        assertThat(response.roomId()).isEqualTo(1L);
        assertThat(response.partnerLastReadMessageId()).isEqualTo(100L);
        assertThat(response.partnerReadAt()).isNotNull();
    }

    // 상대방이 아직 읽음 처리하지 않았다면 읽은 메시지 번호가 없습니다.
    @Test
    void returnsEmptyReadStatus() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatReadStateRepository.findPartnerReadState(1L, 10L))
                .thenReturn(Optional.empty());

        ChatReadStatusResponse response =
                chatReadService.getPartnerReadStatus(1L, 10L);

        assertThat(response.partnerLastReadMessageId()).isNull();
        assertThat(response.partnerReadAt()).isNull();
    }
}
