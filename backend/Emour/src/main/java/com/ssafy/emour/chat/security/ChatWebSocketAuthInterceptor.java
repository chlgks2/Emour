package com.ssafy.emour.chat.security;

import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Collections;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class ChatWebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final Pattern ROOM_DESTINATION = Pattern.compile(
            "^/(pub|sub)/chat/rooms/(\\d+)/(messages|read|reactions|analysis|image-deletions)$"
    );

    private final JwtTokenProvider jwtTokenProvider;
    private final CoupleMemberRepository coupleMemberRepository;

    @Override
    public Message<?> preSend(Message<?> message, org.springframework.messaging.MessageChannel channel) {
        StompHeaderAccessor accessor =
                StompHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (accessor.getCommand() == StompCommand.CONNECT) {
            authenticate(accessor);
            return message;
        }

        if (accessor.getCommand() == StompCommand.SEND
                || accessor.getCommand() == StompCommand.SUBSCRIBE) {
            Long userId = getUserId(accessor.getUser());
            validateDestination(
                    accessor.getCommand(),
                    userId,
                    accessor.getDestination()
            );
        }

        return message;
    }

    // STOMP 연결 헤더의 Access Token으로 WebSocket 사용자를 인증합니다.
    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization == null) {
            authorization = accessor.getFirstNativeHeader("authorization");
        }

        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            throw new MessageDeliveryException("WebSocket 연결에 Access Token이 필요합니다.");
        }

        String token = authorization.substring(BEARER_PREFIX.length());
        if (!jwtTokenProvider.validateToken(token)
                || !"access".equals(jwtTokenProvider.getType(token))) {
            throw new MessageDeliveryException("유효한 Access Token이 아닙니다.");
        }

        Long userId = jwtTokenProvider.getUserId(token);
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                userId,
                null,
                Collections.emptyList()
        ));
    }

    // 허용된 주소인지 확인하고 다른 커플방 접근을 막습니다.
    private void validateDestination(
            StompCommand command,
            Long userId,
            String destination
    ) {
        if (destination == null) {
            throw new MessageDeliveryException("WebSocket 주소가 필요합니다.");
        }

        if (command == StompCommand.SUBSCRIBE
                && "/user/queue/errors".equals(destination)) {
            return;
        }

        Matcher matcher = ROOM_DESTINATION.matcher(destination);
        if (!matcher.matches()) {
            throw new MessageDeliveryException("허용되지 않은 WebSocket 주소입니다.");
        }

        String prefix = matcher.group(1);
        String channel = matcher.group(3);
        if (command == StompCommand.SEND && !"pub".equals(prefix)) {
            throw new MessageDeliveryException("메시지는 /pub 주소로만 보낼 수 있습니다.");
        }
        if (command == StompCommand.SUBSCRIBE && !"sub".equals(prefix)) {
            throw new MessageDeliveryException("채팅은 /sub 주소만 구독할 수 있습니다.");
        }
        if (command == StompCommand.SEND
                && ("reactions".equals(channel)
                || "analysis".equals(channel)
                || "image-deletions".equals(channel))) {
            throw new MessageDeliveryException("해당 이벤트는 서버만 전송할 수 있습니다.");
        }

        Long roomId = Long.valueOf(matcher.group(2));
        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );

        if (!activeMember) {
            throw new MessageDeliveryException("해당 채팅방에 참여 중인 사용자가 아닙니다.");
        }
    }

    private Long getUserId(Principal principal) {
        if (principal == null) {
            throw new MessageDeliveryException("WebSocket 로그인이 필요합니다.");
        }

        try {
            return Long.valueOf(principal.getName());
        } catch (NumberFormatException exception) {
            throw new MessageDeliveryException("WebSocket 로그인 정보를 확인할 수 없습니다.");
        }
    }
}
