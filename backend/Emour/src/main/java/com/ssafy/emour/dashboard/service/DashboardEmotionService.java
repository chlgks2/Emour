package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.EmotionFlowSlot;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardEmotionService {

    private final DashboardSnapshotService dashboardSnapshotService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardEmotionFlowResponse getDailyEmotionFlow(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        Dashboard dashboard = dashboardSnapshotService.ensureSnapshot(
                roomId,
                userId,
                date
        );
        List<EmotionFlowSlot> flow = readFlow(
                dashboard.getEmotionFlow()
        );
        int analyzedMessageCount = flow.stream()
                .mapToInt(slot ->
                        slot.positiveCount()
                                + slot.negativeCount()
                                + slot.neutralCount())
                .sum();

        return new DashboardEmotionFlowResponse(
                dashboard.getRoomId(),
                dashboard.getUserId(),
                dashboard.getSummaryDate(),
                analyzedMessageCount,
                flow,
                dashboard.getCalculatedAt()
        );
    }

    private List<EmotionFlowSlot> readFlow(String json) {
        try {
            return objectMapper.readValue(
                    json,
                    new TypeReference<List<EmotionFlowSlot>>() {
                    }
            );
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }
}
