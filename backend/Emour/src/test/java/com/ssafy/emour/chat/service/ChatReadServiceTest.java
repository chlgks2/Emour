package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatReadRequest;
import com.ssafy.emour.chat.dto.ChatReadResponse;
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

    @Test
    void 마지막으로_읽은_메시지를_저장한다() {
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
                new ChatReadRequest(10L, 100L)
        );

        assertThat(response.roomId()).isEqualTo(1L);
        assertThat(response.userId()).isEqualTo(10L);
        assertThat(response.lastReadMessageId()).isEqualTo(100L);
        assertThat(response.readAt()).isNotNull();
    }

    @Test
    void 채팅을_읽은_적이_없으면_상대방의_모든_메시지를_안_읽은_개수로_센다() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatReadStateRepository.findById(
                new ChatReadStateId(10L, 1L)
        )).thenReturn(Optional.empty());
        when(chatMessageRepository
                .countByRoomIdAndSenderIdNotAndDeletedAtIsNull(1L, 10L))
                .thenReturn(3L);

        ChatUnreadCountResponse response =
                chatReadService.getUnreadCount(1L, 10L);

        assertThat(response.lastReadMessageId()).isNull();
        assertThat(response.unreadCount()).isEqualTo(3L);
    }

    @Test
    void 마지막으로_읽은_메시지_뒤의_상대방_메시지만_센다() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        ChatReadState state = ChatReadState.first(10L, 1L, 100L);
        when(chatReadStateRepository.findById(
                new ChatReadStateId(10L, 1L)
        )).thenReturn(Optional.of(state));
        when(chatMessageRepository
                .countByRoomIdAndSenderIdNotAndMessageIdGreaterThanAndDeletedAtIsNull(
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
}
