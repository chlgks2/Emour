package com.ssafy.emour.dashboard.repository;

import com.ssafy.emour.dashboard.entity.Dashboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DashboardRepository extends JpaRepository<Dashboard, Long> {

    Optional<Dashboard> findByRoomIdAndUserIdAndSummaryDate(
            Long roomId,
            Long userId,
            LocalDate summaryDate
    );

    List<Dashboard>
    findAllByRoomIdAndUserIdAndSummaryDateGreaterThanEqualAndSummaryDateLessThanOrderBySummaryDateAsc(
            Long roomId,
            Long userId,
            LocalDate startDate,
            LocalDate endExclusive
    );
}
