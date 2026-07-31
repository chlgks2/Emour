package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.entity.Dashboard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DashboardSnapshotService dashboardSnapshotService;

    @Transactional
    public DashboardCountResponse getDailyCounts(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        Dashboard dashboard = dashboardSnapshotService.ensureSnapshot(
                roomId,
                userId,
                date
        );

        return new DashboardCountResponse(
                dashboard.getDashboardId(),
                dashboard.getRoomId(),
                dashboard.getUserId(),
                dashboard.getSummaryDate(),
                dashboard.getMessageCount(),
                dashboard.getImageCount(),
                dashboard.getReactionCount(),
                dashboard.getBookmarkCount(),
                dashboard.getCalculatedAt(),
                dashboard.getUpdatedAt()
        );
    }
}
