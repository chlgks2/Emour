package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.ScheduleCreateRequest;
import com.ssafy.emour.calendar.dto.response.ScheduleResponse;
import com.ssafy.emour.calendar.entity.CoupleSchedule;
import com.ssafy.emour.calendar.repository.CoupleScheduleRepository;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final CoupleScheduleRepository scheduleRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;

    @Transactional
    public ScheduleResponse create(
            Long userId,
            ScheduleCreateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule schedule = CoupleSchedule.createSchedule(
                room.getId(),
                userId,
                request.name(),
                request.scheduleDate(),
                request.scheduleTime()
        );

        return ScheduleResponse.from(scheduleRepository.save(schedule));
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
}
