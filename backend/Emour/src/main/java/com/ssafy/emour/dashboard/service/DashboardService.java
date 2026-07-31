package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReactionRepository chatReactionRepository;
    private final ChatBookmarkRepository chatBookmarkRepository;
    private final CoupleMemberRepository coupleMemberRepository;

    @Transactional
    public DashboardCountResponse getDailyCounts(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        validateRequest(roomId, userId, date);

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        // 로그인한 사용자가 해당 날짜에 만든 데이터만 각각 셉니다.
        int messageCount = toInt(chatMessageRepository
                .countByRoomIdAndSenderIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        roomId,
                        userId,
                        start,
                        end
                ));
        int imageCount = toInt(chatMessageRepository.countImages(
                roomId,
                userId,
                start,
                end
        ));
        int reactionCount = toInt(chatReactionRepository
                .countByRoomIdAndUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        roomId,
                        userId,
                        start,
                        end
                ));
        int bookmarkCount = toInt(chatBookmarkRepository
                .countByRoomIdAndUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        roomId,
                        userId,
                        start,
                        end
                ));

        // 같은 날짜의 행이 있으면 고치고, 없으면 새로 만듭니다.
        Dashboard dashboard = dashboardRepository
                .findByRoomIdAndUserIdAndSummaryDate(roomId, userId, date)
                .orElseGet(() -> Dashboard.create(roomId, userId, date));

        dashboard.updateCounts(
                messageCount,
                imageCount,
                reactionCount,
                bookmarkCount
        );

        return toResponse(dashboardRepository.save(dashboard));
    }

    private void validateRequest(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        if (roomId == null || userId == null || date == null
                || date.isAfter(LocalDate.now())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
    }

    private int toInt(long count) {
        return Math.toIntExact(count);
    }

    private DashboardCountResponse toResponse(Dashboard dashboard) {
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
