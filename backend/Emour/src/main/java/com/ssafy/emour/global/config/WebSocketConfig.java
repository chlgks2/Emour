package com.ssafy.emour.global.config;

import com.ssafy.emour.chat.security.ChatWebSocketAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@RequiredArgsConstructor
// WebSocket과 STOMP를 사용할 수 있게 켜 주는 설정입니다.
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ChatWebSocketAuthInterceptor chatWebSocketAuthInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 브라우저는 이 주소를 통해 채팅 서버와 처음 연결합니다.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // "/sub"로 시작하는 주소를 구독하면 서버가 보내는 메시지를 받을 수 있습니다.
        // "/queue"는 요청한 사용자에게만 오류를 보낼 때 사용합니다.
        registry.enableSimpleBroker("/sub", "/queue");

        // 브라우저가 서버로 메시지를 보낼 때는 "/pub"로 시작하는 주소를 사용합니다.
        registry.setApplicationDestinationPrefixes("/pub");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // 연결, 메시지 전송, 방 구독 요청마다 JWT와 방 멤버 여부를 확인합니다.
        registration.interceptors(chatWebSocketAuthInterceptor);
    }
}
