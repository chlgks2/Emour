package com.ssafy.emour.calendar.controller;

import com.ssafy.emour.calendar.dto.request.ScheduleCreateRequest;
import com.ssafy.emour.calendar.dto.request.ScheduleUpdateRequest;
import com.ssafy.emour.calendar.dto.response.ScheduleResponse;
import com.ssafy.emour.calendar.service.ScheduleService;
import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/schedules")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @Valid @RequestBody ScheduleCreateRequest request
    ) {
        ScheduleResponse response = scheduleService.create(
                SecurityUtil.getCurrentUserId(),
                request
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("일정을 등록했습니다.", response));
    }

    @PatchMapping("/{scheduleId}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> update(
            @PathVariable Long scheduleId,
            @Valid @RequestBody ScheduleUpdateRequest request
    ) {
        ScheduleResponse response = scheduleService.update(
                SecurityUtil.getCurrentUserId(),
                scheduleId,
                request
        );
        return ResponseEntity.ok(
                ApiResponse.success("일정을 수정했습니다.", response)
        );
    }

    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long scheduleId
    ) {
        scheduleService.delete(
                SecurityUtil.getCurrentUserId(),
                scheduleId
        );
        return ResponseEntity.ok(
                ApiResponse.success("일정을 삭제했습니다.", null)
        );
    }
}
