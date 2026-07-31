package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.EmotionPolarity;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.EmotionFlowSlot;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardEmotionService {

    private static final int SLOT_HOURS = 2;
    private static final int SLOT_COUNT = 12;

    private final ChatAnalysisRepository chatAnalysisRepository;
    private final DashboardRepository dashboardRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardEmotionFlowResponse getDailyEmotionFlow(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        validateRequest(roomId, userId, date);

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        List<ChatAnalysis> analyses =
                chatAnalysisRepository.findCompletedDailyAnalyses(
                        roomId,
                        userId,
                        start,
                        end
                );

        // 하루를 0~2시, 2~4시처럼 총 12개 칸으로 나눕니다.
        int[][] counts = new int[SLOT_COUNT][3];
        for (ChatAnalysis analysis : analyses) {
            int slotIndex = analysis.getMessage().getSentAt().getHour()
                    / SLOT_HOURS;
            int polarityIndex = getPolarityIndex(analysis.getEmotionType());
            counts[slotIndex][polarityIndex]++;
        }

        List<EmotionFlowSlot> flow = createFlow(counts);
        Dashboard dashboard = dashboardRepository
                .findByRoomIdAndUserIdAndSummaryDate(roomId, userId, date)
                .orElseGet(() -> Dashboard.create(roomId, userId, date));

        dashboard.updateEmotionFlow(toJson(flow));
        Dashboard saved = dashboardRepository.save(dashboard);

        return new DashboardEmotionFlowResponse(
                saved.getRoomId(),
                saved.getUserId(),
                saved.getSummaryDate(),
                analyses.size(),
                flow,
                saved.getCalculatedAt()
        );
    }

    private List<EmotionFlowSlot> createFlow(int[][] counts) {
        List<EmotionFlowSlot> flow = new ArrayList<>(SLOT_COUNT);

        for (int index = 0; index < SLOT_COUNT; index++) {
            int startHour = index * SLOT_HOURS;
            flow.add(new EmotionFlowSlot(
                    startHour,
                    startHour + SLOT_HOURS,
                    counts[index][0],
                    counts[index][1],
                    counts[index][2]
            ));
        }
        return flow;
    }

    private int getPolarityIndex(String emotionType) {
        EmotionPolarity polarity = EmotionType
                .fromStoredValue(emotionType)
                .getPolarity();
        if (polarity == EmotionPolarity.POSITIVE) {
            return 0;
        }
        if (polarity == EmotionPolarity.NEGATIVE) {
            return 1;
        }
        return 2;
    }

    private String toJson(List<EmotionFlowSlot> flow) {
        try {
            return objectMapper.writeValueAsString(flow);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
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
}
