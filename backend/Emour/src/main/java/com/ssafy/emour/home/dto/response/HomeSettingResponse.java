package com.ssafy.emour.home.dto.response;

import com.ssafy.emour.home.entity.HomeBackgroundStyle;
import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.entity.HomeTextAlignment;
import com.ssafy.emour.home.entity.HomeTextColor;
import com.ssafy.emour.home.entity.HomeTextSize;

import java.math.BigDecimal;

public record HomeSettingResponse(
        Long roomId,
        String imageUrl,
        String textContent,
        BigDecimal textPositionX,
        BigDecimal textPositionY,
        HomeTextSize textSize,
        HomeTextAlignment textAlignment,
        HomeBackgroundStyle backgroundStyle,
        HomeTextColor textColor
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
                setting.getBackgroundStyle(),
                setting.getTextColor()
        );
    }
}
