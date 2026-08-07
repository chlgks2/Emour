package com.ssafy.emour.chat.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatRedisSubscriber implements MessageListener {

    private static final Pattern ALLOWED_DESTINATION = Pattern.compile(
            "^/sub/chat/rooms/\\d+/(messages|read|reactions|analysis|images)$"
    );

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String eventJson = new String(message.getBody(), StandardCharsets.UTF_8);
            ChatRedisEvent event = objectMapper.readValue(
                    eventJson,
                    ChatRedisEvent.class
            );

            // 정해진 채팅 구독 주소만 전달해 잘못된 Redis 메시지의 전파를 막습니다.
            if (event.destination() == null
                    || event.payload() == null
                    || !ALLOWED_DESTINATION.matcher(event.destination()).matches()) {
                log.warn("허용되지 않은 Redis 채팅 이벤트를 무시합니다: {}", event.destination());
                return;
            }

            // 이 서버에 WebSocket으로 연결된 사용자들에게 이벤트를 전달합니다.
            messagingTemplate.convertAndSend(
                    event.destination(),
                    event.payload().toString()
            );
        } catch (Exception exception) {
            // 잘못된 이벤트 하나 때문에 Redis 구독 스레드가 멈추지 않게 합니다.
            log.warn("Redis 채팅 이벤트 처리에 실패했습니다: {}", exception.getMessage());
        }
    }
}
