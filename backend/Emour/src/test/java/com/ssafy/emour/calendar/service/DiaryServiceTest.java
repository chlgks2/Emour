package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.DiaryCreateRequest;
import com.ssafy.emour.calendar.dto.request.DiaryUpdateRequest;
import com.ssafy.emour.calendar.entity.Diary;
import com.ssafy.emour.calendar.repository.DiaryRepository;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DiaryServiceTest {

    @Mock
    private DiaryRepository diaryRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    private DiaryService diaryService;

    @BeforeEach
    void setUp() {
        diaryService = new DiaryService(
                diaryRepository,
                memberRepository,
                coupleRoomRepository
        );
    }

    @Test
    void 날짜별로_본인의_한줄_일기를_작성한다() {
        Long userId = 1L;
        Long roomId = 10L;
        LocalDate date = LocalDate.of(2026, 8, 5);
        CoupleRoom room = mock(CoupleRoom.class);
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(diaryRepository.save(any(Diary.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = diaryService.create(
                userId,
                new DiaryCreateRequest(date, "  행복한 하루였다.  ")
        );

        assertThat(response.coupleRoomId()).isEqualTo(roomId);
        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.date()).isEqualTo(date);
        assertThat(response.content()).isEqualTo("행복한 하루였다.");
    }

    @Test
    void 같은_날짜에는_한줄_일기를_두번_작성할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        LocalDate date = LocalDate.of(2026, 8, 5);
        CoupleRoom room = mock(CoupleRoom.class);
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(diaryRepository.existsByRoomIdAndUserIdAndDiaryDate(
                roomId, userId, date
        )).willReturn(true);

        assertThatThrownBy(() -> diaryService.create(
                userId,
                new DiaryCreateRequest(date, "두 번째 기록")
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DIARY_ALREADY_EXISTS);

        verify(diaryRepository, never()).save(any());
    }

    @Test
    void 본인의_한줄_일기_내용을_수정한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long diaryId = 100L;
        LocalDate date = LocalDate.of(2026, 8, 5);
        CoupleRoom room = mock(CoupleRoom.class);
        Diary diary = Diary.create(roomId, userId, date, "수정 전");
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(diaryRepository.findById(diaryId))
                .willReturn(Optional.of(diary));

        var response = diaryService.update(
                userId,
                diaryId,
                new DiaryUpdateRequest("  수정 후  ")
        );

        assertThat(response.content()).isEqualTo("수정 후");
        assertThat(response.date()).isEqualTo(date);
    }

    @Test
    void 상대방의_한줄_일기는_수정할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long diaryId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        Diary partnerDiary = Diary.create(
                roomId,
                2L,
                LocalDate.of(2026, 8, 5),
                "상대방 기록"
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(diaryRepository.findById(diaryId))
                .willReturn(Optional.of(partnerDiary));

        assertThatThrownBy(() -> diaryService.update(
                userId,
                diaryId,
                new DiaryUpdateRequest("수정 시도")
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        assertThat(partnerDiary.getContent()).isEqualTo("상대방 기록");
    }

    @Test
    void 본인의_한줄_일기를_삭제한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long diaryId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        Diary diary = Diary.create(
                roomId,
                userId,
                LocalDate.of(2026, 8, 5),
                "나의 기록"
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(diaryRepository.findById(diaryId))
                .willReturn(Optional.of(diary));

        diaryService.delete(userId, diaryId);

        verify(diaryRepository).delete(diary);
    }

    @Test
    void 상대방의_한줄_일기는_삭제할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long diaryId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        Diary partnerDiary = Diary.create(
                roomId,
                2L,
                LocalDate.of(2026, 8, 5),
                "상대방 기록"
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(diaryRepository.findById(diaryId))
                .willReturn(Optional.of(partnerDiary));

        assertThatThrownBy(() -> diaryService.delete(userId, diaryId))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        verify(diaryRepository, never()).delete(any());
    }
}
