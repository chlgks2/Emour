package com.ssafy.emour.mood.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import com.ssafy.emour.mood.dto.request.MoodCreateRequest;
import com.ssafy.emour.mood.dto.request.MoodUpdateRequest;
import com.ssafy.emour.mood.dto.response.MoodCreateResponse;
import com.ssafy.emour.mood.dto.response.MoodResponse;
import com.ssafy.emour.mood.dto.response.MoodUpdateResponse;
import com.ssafy.emour.mood.entity.Mood;
import com.ssafy.emour.mood.entity.MoodNotification;
import com.ssafy.emour.mood.repository.MoodNotificationRepository;
import com.ssafy.emour.mood.repository.MoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MoodService {

    private final MoodRepository moodRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;
    private final MoodNotificationRepository moodNotificationRepository;
    private final MoodSlotCalculator moodSlotCalculator;
    private final MoodTimeProvider moodTimeProvider;

    @Transactional
    public MoodCreateResponse create(Long userId, MoodCreateRequest request) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        CoupleRoom room = coupleRoomRepository.findActiveRoomByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND));

        MoodNotification notification = moodNotificationRepository
                .findByRoomIdAndActiveTrue(room.getId())
                .orElseThrow(() -> new CustomException(
                        ErrorCode.MOOD_NOTIFICATION_NOT_FOUND
                ));

        LocalDateTime currentTime = moodTimeProvider.now();
        LocalDateTime moodDatetime = moodSlotCalculator.currentSlot(
                        notification,
                        currentTime
                )
                .orElseThrow(() -> new CustomException(
                        ErrorCode.MOOD_REGISTRATION_NOT_ALLOWED
                ));

        if (moodRepository.existsByRoomIdAndUserIdAndMoodDatetime(
                room.getId(),
                userId,
                moodDatetime
        )) {
            throw new CustomException(ErrorCode.MOOD_ALREADY_REGISTERED);
        }

        Mood mood = Mood.create(
                room.getId(),
                userId,
                moodDatetime,
                request.moodType(),
                currentTime
        );

        return MoodCreateResponse.from(moodRepository.save(mood));
    }

    @Transactional
    public MoodUpdateResponse update(
            Long userId,
            Long moodId,
            MoodUpdateRequest request
    ) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        CoupleRoom room = coupleRoomRepository.findActiveRoomByUserId(userId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));

        Mood mood = moodRepository.findById(moodId)
                .orElseThrow(() -> new CustomException(ErrorCode.MOOD_NOT_FOUND));

        if (!mood.getRoomId().equals(room.getId())
                || !mood.getUserId().equals(userId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }

        MoodNotification notification = moodNotificationRepository
                .findByRoomIdAndActiveTrue(room.getId())
                .orElseThrow(() -> new CustomException(
                        ErrorCode.MOOD_NOTIFICATION_NOT_FOUND
                ));

        LocalDateTime currentTime = moodTimeProvider.now();
        LocalDateTime currentSlot = moodSlotCalculator.currentSlot(
                        notification,
                        currentTime
                )
                .orElseThrow(() -> new CustomException(
                        ErrorCode.MOOD_UPDATE_NOT_ALLOWED
                ));

        if (!mood.getMoodDatetime().equals(currentSlot)) {
            throw new CustomException(ErrorCode.MOOD_UPDATE_NOT_ALLOWED);
        }

        mood.updateMoodType(request.moodType(), currentTime);
        return MoodUpdateResponse.from(mood);
    }

    @Transactional(readOnly = true)
    public List<MoodResponse> getAll(Long userId) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        CoupleRoom room = coupleRoomRepository.findActiveRoomByUserId(userId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));

        return moodRepository
                .findAllByRoomIdOrderByMoodDatetimeDescUserIdAsc(room.getId())
                .stream()
                .map(MoodResponse::from)
                .toList();
    }
}
