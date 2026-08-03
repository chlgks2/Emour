package com.ssafy.emour.dashboard.event;

import java.time.LocalDate;

/**
 * 대시보드 원본 데이터가 바뀌었음을 알리는 내부 이벤트입니다.
 * 실제 집계는 원본 데이터의 트랜잭션이 성공한 뒤에 수행합니다.
 */
public record DashboardChangedEvent(
        Long roomId,
        Long userId,
        LocalDate summaryDate,
        boolean refreshCouple,
        boolean refreshMember
) {
}
