package com.ssafy.emour.chat.security;

import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatWebSocketAuthInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private MessageChannel messageChannel;

    @InjectMocks
    private ChatWebSocketAuthInterceptor interceptor;

    // 유효한 Access Token으로 연결하면 토큰 회원이 WebSocket 사용자로 저장됩니다.
    @Test
    void authenticatesConnection() {
        when(jwtTokenProvider.validateToken("access-token")).thenReturn(true);
        when(jwtTokenProvider.getType("access-token")).thenReturn("access");
        when(jwtTokenProvider.getUserId("access-token")).thenReturn(10L);

        Message<byte[]> message = stompMessage(
                StompCommand.CONNECT,
                null,
                "Bearer access-token",
                null
        );

        Message<?> result = interceptor.preSend(message, messageChannel);
        StompHeaderAccessor accessor =
                StompHeaderAccessor.wrap(result);

        assertThat(accessor.getUser()).isNotNull();
        assertThat(accessor.getUser().getName()).isEqualTo("10");
    }

    // Access Token이 없으면 WebSocket 연결을 거절합니다.
    @Test
    void rejectsMissingToken() {
        Message<byte[]> message = stompMessage(
                StompCommand.CONNECT,
                null,
                null,
                null
        );

        assertThatThrownBy(() ->
                interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Access Token");
    }

    // 현재 회원이 참여 중인 커플방만 구독할 수 있습니다.
    @Test
    void allowsMemberSubscription() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        Message<byte[]> message = stompMessage(
                StompCommand.SUBSCRIBE,
                "/sub/chat/rooms/1/messages",
                null,
                10L
        );

        assertThatCode(() -> interceptor.preSend(message, messageChannel))
                .doesNotThrowAnyException();
    }

    // 채팅방 멤버는 공감 변경 알림 채널도 구독할 수 있습니다.
    @Test
    void allowsReactionSubscription() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        Message<byte[]> message = stompMessage(
                StompCommand.SUBSCRIBE,
                "/sub/chat/rooms/1/reactions",
                null,
                10L
        );

        assertThatCode(() -> interceptor.preSend(message, messageChannel))
                .doesNotThrowAnyException();
    }

    // 감정 분석 결과도 현재 채팅방의 회원만 구독할 수 있습니다.
    @Test
    void allowsAnalysisSubscription() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        Message<byte[]> message = stompMessage(
                StompCommand.SUBSCRIBE,
                "/sub/chat/rooms/1/analysis",
                null,
                10L
        );

        assertThatCode(() -> interceptor.preSend(message, messageChannel))
                .doesNotThrowAnyException();
    }

    @Test
    void allowsImageDeletionSubscription() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);

        Message<byte[]> message = stompMessage(
                StompCommand.SUBSCRIBE,
                "/sub/chat/rooms/1/image-deletions",
                null,
                10L
        );

        assertThatCode(() -> interceptor.preSend(message, messageChannel))
                .doesNotThrowAnyException();
    }

    // 참여하지 않은 커플방의 메시지는 구독할 수 없습니다.
    @Test
    void rejectsNonMemberSubscription() {
        Message<byte[]> message = stompMessage(
                StompCommand.SUBSCRIBE,
                "/sub/chat/rooms/1/messages",
                null,
                10L
        );

        assertThatThrownBy(() ->
                interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("참여 중인 사용자");
    }

    // 클라이언트가 구독 주소로 메시지를 직접 보내는 우회를 막습니다.
    @Test
    void rejectsSendToBroker() {
        Message<byte[]> message = stompMessage(
                StompCommand.SEND,
                "/sub/chat/rooms/1/messages",
                null,
                10L
        );

        assertThatThrownBy(() ->
                interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("/pub");
    }

    private Message<byte[]> stompMessage(
            StompCommand command,
            String destination,
            String authorization,
            Long userId
    ) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);

        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        if (userId != null) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    Collections.emptyList()
            ));
        }

        return MessageBuilder.createMessage(
                new byte[0],
                accessor.getMessageHeaders()
        );
    }
}
