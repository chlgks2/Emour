package com.ssafy.emour.home.dto.response;

import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.entity.HomeTextAlignment;

import java.math.BigDecimal;

public record HomeSettingResponse(
        Long roomId,
        String imageUrl,
        String textContent,
        BigDecimal textPositionX,
        BigDecimal textPositionY,
        Integer textSize,
        HomeTextAlignment textAlignment,
        Integer backgroundTransparency,
        String textColor
) {
    public static HomeSettingResponse from(HomeImageSetting setting) {
        return new HomeSettingResponse(
                setting.getRoomId(),
                setting.getImageUrl(),
                setting.getTextContent(),
                setting.getTextPositionX(),
                setting.getTextPositionY(),
                setting.getTextSize(),
                setting.getTextAlignment(),
                setting.getBackgroundTransparency(),
                setting.getTextColor()
        );
    }
}
