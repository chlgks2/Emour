package com.ssafy.emour.home.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.dto.request.HomeSettingUpdateRequest;
import com.ssafy.emour.home.entity.HomeTextAlignment;
import com.ssafy.emour.home.repository.HomeImageSettingRepository;
import com.ssafy.emour.global.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.List;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class HomeSettingServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long ROOM_ID = 10L;

    @Mock
    private HomeImageSettingRepository homeImageSettingRepository;
    @Mock
    private CoupleRoomRepository coupleRoomRepository;
    @Mock
    private FileStorage fileStorage;
    @Mock
    private MultipartFile multipartFile;

    private HomeSettingService homeSettingService;

    @BeforeEach
    void setUp() {
        homeSettingService = new HomeSettingService(
                homeImageSettingRepository,
                coupleRoomRepository,
                fileStorage
        );
    }

    @Test
    void returnsDefaultSettingWhenMissing() {
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        given(coupleRoomRepository.findReadableRoomsByUserId(
                org.mockito.ArgumentMatchers.eq(USER_ID),
                any(Pageable.class)
        )).willReturn(List.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.empty());

        var response = homeSettingService.getSetting(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.textSize()).isEqualTo(24);
        assertThat(response.backgroundTransparency()).isEqualTo(80);
        assertThat(response.textColor()).isEqualTo("rgb(255, 255, 255)");
        assertThat(response.textPositionX()).isEqualByComparingTo("50.00");
        assertThat(response.textPositionY()).isEqualByComparingTo("72.00");
    }

    @Test
    void returnsSharedCoupleSettingAfterPartnerLeaves() {
        HomeImageSetting setting = HomeImageSetting.defaults(ROOM_ID);
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        room.deactivate();
        given(coupleRoomRepository.findReadableRoomsByUserId(
                org.mockito.ArgumentMatchers.eq(USER_ID),
                any(Pageable.class)
        )).willReturn(List.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.of(setting));

        var response = homeSettingService.getSetting(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
    }

    @Test
    void savesSharedCoupleSetting() {
        HomeImageSetting setting = HomeImageSetting.defaults(ROOM_ID);
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        given(coupleRoomRepository.findActiveRoomByUserId(USER_ID))
                .willReturn(Optional.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.of(setting));
        given(homeImageSettingRepository.save(any(HomeImageSetting.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = homeSettingService.updateSetting(
                USER_ID,
                new HomeSettingUpdateRequest(
                        "우리의 문구",
                        new BigDecimal("40.00"),
                        new BigDecimal("65.00"),
                        32,
                        HomeTextAlignment.CENTER,
                        60,
                        "rgb(12, 34, 56)"
                )
        );

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.textContent()).isEqualTo("우리의 문구");
        assertThat(response.textPositionX()).isEqualByComparingTo("40.00");
        assertThat(response.textSize()).isEqualTo(32);
        assertThat(response.backgroundTransparency()).isEqualTo(60);
        assertThat(response.textColor()).isEqualTo("rgb(12, 34, 56)");
    }

    @Test
    void rejectsRgbChannelOver255() {
        HomeImageSetting setting = HomeImageSetting.defaults(ROOM_ID);
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        given(coupleRoomRepository.findActiveRoomByUserId(USER_ID))
                .willReturn(Optional.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.of(setting));

        HomeSettingUpdateRequest request = new HomeSettingUpdateRequest(
                "우리의 문구",
                new BigDecimal("40.00"),
                new BigDecimal("65.00"),
                24,
                HomeTextAlignment.CENTER,
                80,
                "rgb(256, 10, 20)"
        );

        assertThatThrownBy(() -> homeSettingService.updateSetting(
                USER_ID,
                request
        )).isInstanceOf(CustomException.class);
    }

    @Test
    void savesUploadedImageInSharedSetting() {
        HomeImageSetting setting = HomeImageSetting.defaults(ROOM_ID);
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        given(coupleRoomRepository.findActiveRoomByUserId(USER_ID))
                .willReturn(Optional.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.of(setting));
        given(multipartFile.isEmpty()).willReturn(false);
        given(multipartFile.getSize()).willReturn(1024L);
        given(multipartFile.getContentType()).willReturn("image/jpeg");
        given(fileStorage.store(multipartFile))
                .willReturn("2026/08/home.jpg");
        given(homeImageSettingRepository.save(any(HomeImageSetting.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = homeSettingService.uploadImage(USER_ID, multipartFile);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.imageUrl())
                .isEqualTo("/uploads/2026/08/home.jpg");
        verify(fileStorage).store(multipartFile);
    }
}
