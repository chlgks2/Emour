package com.ssafy.emour.chat.repository;

import java.time.LocalDateTime;

/**
 * 방마다 아직 분석하지 않은 메시지가 얼마나 쌓였는지 보여주는 조회 결과입니다.
 */
public interface PendingAnalysisRoomSummary {

    Long getRoomId();

    long getPendingCount();

    long getSenderCount();

    LocalDateTime getLastSentAt();
}
