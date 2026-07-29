package com.ssafy.emour.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI emourOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Emour Backend API")
                        .version("v1")
                        .description("""
                                연인의 감정과 대화를 기록하는 Emour 백엔드 API입니다.

                                ## WebSocket 채팅

                                Swagger는 REST API를 실행하는 도구라서 STOMP WebSocket을
                                직접 실행할 수 없습니다. 채팅은 다음 주소를 사용합니다.

                                - 브라우저 테스트 화면: `/websocket-test.html`
                                - 연결: `/ws`
                                - 메시지 전송: `/pub/chat/rooms/{roomId}/messages`
                                - 메시지 구독: `/sub/chat/rooms/{roomId}/messages`
                                - 읽음 전송: `/pub/chat/rooms/{roomId}/read`
                                - 읽음 구독: `/sub/chat/rooms/{roomId}/read`
                                - 개인 오류 구독: `/user/queue/errors`

                                실제 앱에서는 WebSocket을 채팅 화면 안이 아니라 앱의 최상위에서
                                한 번 연결합니다. 다른 화면으로 이동해도 연결과 메시지 구독은
                                유지하고, 채팅 화면을 보고 있을 때만 읽음 처리를 전송합니다.

                                메시지 전송 예시:

                                ```json
                                {
                                  "senderId": 1,
                                  "clientMessageId": "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                                  "messageType": "TEXT",
                                  "content": "안녕!",
                                  "imageUrls": []
                                }
                                ```
                                """));
    }
}
