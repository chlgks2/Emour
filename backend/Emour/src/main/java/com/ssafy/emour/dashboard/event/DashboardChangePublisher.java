package com.ssafy.emour.dashboard.event;

import com.ssafy.emour.chat.entity.ChatMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 채팅 기능에서 발생한 변경을 대시보드 집계 기능에 전달합니다. */
@Component
@RequiredArgsConstructor
public class DashboardChangePublisher {

    private final ApplicationEventPublisher eventPublisher;

    public void messageSaved(ChatMessage message) {
        publish(message, false);
    }

    public void reactionChanged(
            Long roomId,
            LocalDateTime changedAt
    ) {
        publish(roomId, null, changedAt, true, false);
    }

    public void bookmarkChanged(
            Long roomId,
            Long userId,
            LocalDateTime changedAt
    ) {
        publish(roomId, userId, changedAt, false, true);
    }

    public void analysisCompleted(ChatMessage message) {
        publish(message, true);
    }

    private void publish(ChatMessage message, boolean refreshMember) {
        publish(
                message.getRoomId(),
                message.getSenderId(),
                message.getSentAt(),
                true,
                refreshMember
        );
    }

    private void publish(
            Long roomId,
            Long userId,
            LocalDateTime changedAt,
            boolean refreshCouple,
            boolean refreshMember
    ) {
        if (roomId == null || changedAt == null) {
            return;
        }
        eventPublisher.publishEvent(new DashboardChangedEvent(
                roomId,
                userId,
                changedAt.toLocalDate(),
                refreshCouple,
                refreshMember
        ));
    }
}
