package com.ssafy.emour.home.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.repository.HomeImageSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class HomeSettingServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long ROOM_ID = 10L;

    @Mock
    private HomeImageSettingRepository homeImageSettingRepository;
    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    private HomeSettingService homeSettingService;

    @BeforeEach
    void setUp() {
        homeSettingService = new HomeSettingService(
                homeImageSettingRepository,
                coupleRoomRepository
        );
    }

    @Test
    void 설정이_없으면_커플방의_기본_홈_설정을_반환한다() {
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        given(coupleRoomRepository.findActiveRoomByUserId(USER_ID))
                .willReturn(Optional.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.empty());

        var response = homeSettingService.getSetting(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.textSize().name()).isEqualTo("MEDIUM");
        assertThat(response.textPositionX()).isEqualByComparingTo("50.00");
        assertThat(response.textPositionY()).isEqualByComparingTo("72.00");
    }

    @Test
    void 두_사용자는_같은_커플방_설정을_조회한다() {
        HomeImageSetting setting = HomeImageSetting.defaults(ROOM_ID);
        CoupleRoom room = CoupleRoom.waiting("ROOM-CODE", null);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        given(coupleRoomRepository.findActiveRoomByUserId(USER_ID))
                .willReturn(Optional.of(room));
        given(homeImageSettingRepository.findById(ROOM_ID))
                .willReturn(Optional.of(setting));

        var response = homeSettingService.getSetting(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
    }
}
