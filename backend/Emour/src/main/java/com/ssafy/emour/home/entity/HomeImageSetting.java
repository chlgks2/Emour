package com.ssafy.emour.home.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "home_image_setting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HomeImageSetting {

    @Id
    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "text_content", length = 255)
    private String textContent;

    @Column(name = "text_position_x", precision = 5, scale = 2)
    private BigDecimal textPositionX;

    @Column(name = "text_position_y", precision = 5, scale = 2)
    private BigDecimal textPositionY;

    @Enumerated(EnumType.STRING)
    @Column(name = "text_size", nullable = false, length = 10)
    private HomeTextSize textSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "text_alignment", nullable = false, length = 10)
    private HomeTextAlignment textAlignment;

    @Enumerated(EnumType.STRING)
    @Column(name = "background_style", nullable = false, length = 20)
    private HomeBackgroundStyle backgroundStyle;

    @Enumerated(EnumType.STRING)
    @Column(name = "text_color", nullable = false, length = 10)
    private HomeTextColor textColor;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static HomeImageSetting defaults(Long roomId) {
        HomeImageSetting setting = new HomeImageSetting();
        setting.roomId = roomId;
        setting.textPositionX = new BigDecimal("50.00");
        setting.textPositionY = new BigDecimal("72.00");
        setting.textSize = HomeTextSize.MEDIUM;
        setting.textAlignment = HomeTextAlignment.LEFT;
        setting.backgroundStyle = HomeBackgroundStyle.TRANSLUCENT;
        setting.textColor = HomeTextColor.WHITE;
        return setting;
    }
}
