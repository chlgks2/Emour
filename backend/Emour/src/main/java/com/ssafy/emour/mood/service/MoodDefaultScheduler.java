package com.ssafy.emour.mood.service;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.mood.entity.Mood;
import com.ssafy.emour.mood.entity.MoodNotification;
import com.ssafy.emour.mood.repository.MoodNotificationRepository;
import com.ssafy.emour.mood.repository.MoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MoodDefaultScheduler {

    private final MoodNotificationRepository moodNotificationRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final MoodRepository moodRepository;
    private final MoodSlotCalculator moodSlotCalculator;
    private final MoodTimeProvider moodTimeProvider;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    @Transactional
    public void createDefaultsForClosedSlots() {
        LocalDateTime currentTime = moodTimeProvider.now();

        for (MoodNotification notification
                : moodNotificationRepository.findAllByActiveTrue()) {
            Optional<LocalDateTime> closedSlot = moodSlotCalculator.slotEndingAt(
                    notification,
                    currentTime
            );
            closedSlot.ifPresent(slot -> createMissingDefaults(
                    notification.getRoomId(),
                    slot,
                    currentTime
            ));
        }
    }

    private void createMissingDefaults(
            Long roomId,
            LocalDateTime moodDatetime,
            LocalDateTime createdAt
    ) {
        List<CoupleMember> activeMembers =
                coupleMemberRepository.findAllByIdRoomIdAndStatus(
                        roomId,
                        CoupleMemberStatus.ACTIVE
                );
        List<Mood> defaults = new ArrayList<>();

        for (CoupleMember member : activeMembers) {
            Long userId = member.getId().getUserId();
            if (!moodRepository.existsByRoomIdAndUserIdAndMoodDatetime(
                    roomId,
                    userId,
                    moodDatetime
            )) {
                defaults.add(Mood.createDefault(
                        roomId,
                        userId,
                        moodDatetime,
                        createdAt
                ));
            }
        }

        if (!defaults.isEmpty()) {
            moodRepository.saveAll(defaults);
        }
    }
}
