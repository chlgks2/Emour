package com.ssafy.emour.chat.messaging;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Redis로 전달할 채팅 이벤트의 공통 모양입니다.
 * destination은 프런트가 구독 중인 WebSocket 주소이고, payload는 실제 데이터입니다.
 */
public record ChatRedisEvent(
        String destination,
        JsonNode payload
) {
}
