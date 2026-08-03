package com.ssafy.emour.album.service;

import com.ssafy.emour.album.entity.AlbumPhoto;
import com.ssafy.emour.album.repository.AlbumPhotoRepository;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AlbumPhotoServiceTest {

    private static final Long ROOM_ID = 10L;
    private static final Long USER_ID = 1L;

    @Mock
    private AlbumPhotoRepository albumPhotoRepository;

    @Mock
    private FileStorage fileStorage;

    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    @Mock
    private MultipartFile file;

    private AlbumPhotoService albumPhotoService;

    @BeforeEach
    void setUp() {
        albumPhotoService = new AlbumPhotoService(
                albumPhotoRepository,
                fileStorage,
                coupleRoomRepository
        );
    }

    @Test
    void 사진을_활성_커플방에_연결해_업로드한다() {
        givenActiveRoom(USER_ID);
        given(fileStorage.store(file)).willReturn("2026/07/photo.jpg");
        given(albumPhotoRepository.save(any(AlbumPhoto.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        albumPhotoService.upload(USER_ID, file, "함께 찍은 사진");

        ArgumentCaptor<AlbumPhoto> captor =
                ArgumentCaptor.forClass(AlbumPhoto.class);
        verify(albumPhotoRepository).save(captor.capture());
        assertThat(captor.getValue().getRoomId()).isEqualTo(ROOM_ID);
        assertThat(captor.getValue().getUploaderId()).isEqualTo(USER_ID);
    }

    @Test
    void 같은_커플방의_사진을_함께_조회한다() {
        givenReadableRoom(USER_ID);
        AlbumPhoto firstPhoto = photo(USER_ID, "first.jpg");
        AlbumPhoto partnerPhoto = photo(2L, "partner.jpg");
        given(albumPhotoRepository.findByRoomIdOrderByCreatedAtDesc(ROOM_ID))
                .willReturn(List.of(firstPhoto, partnerPhoto));

        var responses = albumPhotoService.getRoomPhotos(USER_ID);

        assertThat(responses).hasSize(2);
        assertThat(responses)
                .extracting(response -> response.roomId())
                .containsOnly(ROOM_ID);
        assertThat(responses)
                .extracting(response -> response.uploaderId())
                .containsExactly(USER_ID, 2L);
        assertThat(responses)
                .extracting(response -> response.imageUrl())
                .containsExactly(
                        "/uploads/first.jpg",
                        "/uploads/partner.jpg"
                );
    }

    @Test
    void 활성_커플방이_없으면_사진을_저장하지_않는다() {
        given(coupleRoomRepository.findCurrentRoomsByUserId(
                USER_ID,
                PageRequest.of(0, 1)
        )).willReturn(List.of());

        assertThatThrownBy(() -> albumPhotoService.upload(
                USER_ID,
                file,
                null
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);

        verify(fileStorage, never()).store(any());
        verify(albumPhotoRepository, never()).save(any());
    }

    @Test
    void 사진_메모는_100자를_초과할_수_없다() {
        String tooLongMemo = "가".repeat(101);

        assertThatThrownBy(() -> albumPhotoService.upload(
                USER_ID,
                file,
                tooLongMemo
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(fileStorage, never()).store(any());
        verify(albumPhotoRepository, never()).save(any());
    }

    private void givenActiveRoom(Long userId) {
        given(coupleRoomRepository.findCurrentRoomsByUserId(
                userId,
                PageRequest.of(0, 1)
        )).willReturn(List.of(activeRoom()));
    }

    private void givenReadableRoom(Long userId) {
        given(coupleRoomRepository.findReadableRoomsByUserId(
                userId,
                PageRequest.of(0, 1)
        )).willReturn(List.of(activeRoom()));
    }

    private CoupleRoom activeRoom() {
        CoupleRoom room = CoupleRoom.waiting(
                "ABCD-2345",
                LocalDateTime.now().plusHours(1)
        );
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        return room;
    }

    private AlbumPhoto photo(Long uploaderId, String imageKey) {
        return AlbumPhoto.builder()
                .roomId(ROOM_ID)
                .uploaderId(uploaderId)
                .imageKey(imageKey)
                .memo(null)
                .build();
    }
}
