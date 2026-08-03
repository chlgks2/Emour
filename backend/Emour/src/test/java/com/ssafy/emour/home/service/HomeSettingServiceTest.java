package com.ssafy.emour.home.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.dto.request.HomeSettingUpdateRequest;
import com.ssafy.emour.home.entity.HomeBackgroundStyle;
import com.ssafy.emour.home.entity.HomeTextAlignment;
import com.ssafy.emour.home.entity.HomeTextColor;
import com.ssafy.emour.home.entity.HomeTextSize;
import com.ssafy.emour.home.repository.HomeImageSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.any;

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

    @Test
    void 어느_사용자가_수정해도_커플방의_같은_설정을_저장한다() {
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
                        HomeTextSize.LARGE,
                        HomeTextAlignment.CENTER,
                        HomeBackgroundStyle.DARK,
                        HomeTextColor.WHITE
                )
        );

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.textContent()).isEqualTo("우리의 문구");
        assertThat(response.textPositionX()).isEqualByComparingTo("40.00");
        assertThat(response.textSize()).isEqualTo(HomeTextSize.LARGE);
    }
}
