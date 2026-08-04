package com.ssafy.emour.home.repository;

import com.ssafy.emour.home.entity.HomeImageSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeImageSettingRepository
        extends JpaRepository<HomeImageSetting, Long> {
}
