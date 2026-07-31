package com.ssafy.emour.mood.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import com.ssafy.emour.mood.dto.request.MoodNotificationUpdateRequest;
import com.ssafy.emour.mood.dto.response.MoodNotificationResponse;
import com.ssafy.emour.mood.entity.MoodNotification;
import com.ssafy.emour.mood.repository.MoodNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MoodNotificationService {

    private final MoodNotificationRepository moodNotificationRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;

    @Transactional(readOnly = true)
    public MoodNotificationResponse get(Long userId) {
        CoupleRoom room = getActiveRoom(userId);
        MoodNotification notification = moodNotificationRepository
                .findById(room.getId())
                .orElseThrow(() -> new CustomException(
                        ErrorCode.MOOD_NOTIFICATION_NOT_FOUND
                ));

        return MoodNotificationResponse.from(notification);
    }

    @Transactional
    public MoodNotificationResponse update(
            Long userId,
            MoodNotificationUpdateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        validateTimeRange(request);

        MoodNotification notification = moodNotificationRepository
                .findById(room.getId())
                .orElseGet(() -> MoodNotification.create(
                        room.getId(),
                        request.startTime(),
                        request.endTime(),
                        request.intervalHours(),
                        request.isEnabled()
                ));

        notification.update(
                request.startTime(),
                request.endTime(),
                request.intervalHours(),
                request.isEnabled()
        );

        return MoodNotificationResponse.from(
                moodNotificationRepository.save(notification)
        );
    }

    private CoupleRoom getActiveRoom(Long userId) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        return coupleRoomRepository.findActiveRoomByUserId(userId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }

    private void validateTimeRange(MoodNotificationUpdateRequest request) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
