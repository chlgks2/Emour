package com.ssafy.emour.calendar.controller;

import com.ssafy.emour.calendar.dto.request.AnniversaryCreateRequest;
import com.ssafy.emour.calendar.dto.response.ScheduleResponse;
import com.ssafy.emour.calendar.service.AnniversaryService;
import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/anniversaries")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AnniversaryController {

    private final AnniversaryService anniversaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @Valid @RequestBody AnniversaryCreateRequest request
    ) {
        ScheduleResponse response = anniversaryService.create(
                SecurityUtil.getCurrentUserId(),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("기념일을 등록했습니다.", response));
    }
}
