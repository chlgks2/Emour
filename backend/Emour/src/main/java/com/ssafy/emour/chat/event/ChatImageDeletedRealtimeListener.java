package com.ssafy.emour.chat.event;

import com.ssafy.emour.chat.dto.ChatImageDeleteResponse;
import com.ssafy.emour.chat.messaging.ChatRealtimePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatImageDeletedRealtimeListener {

    private final ChatRealtimePublisher realtimePublisher;

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void publish(ChatImageDeletedEvent event) {
        ChatImageDeleteResponse response = event.response();
        try {
            realtimePublisher.publishImageDeletion(
                    response.roomId(),
                    response
            );
        } catch (RuntimeException exception) {
            // DB 삭제는 이미 완료됐으므로 Redis 장애 때문에 API를 실패시키지 않습니다.
            log.warn(
                    "채팅 이미지 삭제 실시간 알림 실패: roomId={}, imageId={}",
                    response.roomId(),
                    response.imageId(),
                    exception
            );
        }
    }
}
