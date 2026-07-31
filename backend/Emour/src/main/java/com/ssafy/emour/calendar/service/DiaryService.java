package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.DiaryCreateRequest;
import com.ssafy.emour.calendar.dto.response.DiaryResponse;
import com.ssafy.emour.calendar.entity.Diary;
import com.ssafy.emour.calendar.repository.DiaryRepository;
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
public class DiaryService {

    private final DiaryRepository diaryRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;

    @Transactional
    public DiaryResponse create(Long userId, DiaryCreateRequest request) {
        CoupleRoom room = getActiveRoom(userId);
        if (diaryRepository.existsByRoomIdAndUserIdAndDiaryDate(
                room.getId(),
                userId,
                request.date()
        )) {
            throw new CustomException(ErrorCode.DIARY_ALREADY_EXISTS);
        }

        Diary diary = Diary.create(
                room.getId(),
                userId,
                request.date(),
                request.content().trim()
        );
        return DiaryResponse.from(diaryRepository.save(diary));
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
