package com.ssafy.emour.auth.controller;

import com.ssafy.emour.auth.dto.request.LoginRequest;
import com.ssafy.emour.auth.dto.request.SignUpRequest;
import com.ssafy.emour.auth.dto.response.LoginResponse;
import com.ssafy.emour.auth.dto.response.SignUpResponse;
import com.ssafy.emour.auth.service.AuthService;
import com.ssafy.emour.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 인증(회원가입/로그인 등) 관련 HTTP 요청 처리.
 *
 * @RestController : 이 클래스의 메서드 반환값을 JSON 응답 본문으로 내보낸다.
 * @RequestMapping("/auth") : 이 컨트롤러의 모든 URL 앞에 /auth 가 붙는다.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 이메일 회원가입.  POST /auth/signup
     *
     * @Valid       : SignUpRequest 의 검증 규칙(@NotBlank 등)을 검사 (실패 시 400)
     * @RequestBody : HTTP 요청 본문(JSON)을 SignUpRequest 객체로 변환
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignUpResponse>> signUp(
            @Valid @RequestBody SignUpRequest request
    ) {
        SignUpResponse response = authService.signUp(request);
        // 새 리소스가 생성됐으므로 201 Created
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("회원가입이 완료되었습니다.", response));
    }

    /**
     * 이메일 로그인.  POST /auth/login
     * 성공 시 Access/Refresh 토큰과 회원 정보를 반환한다.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(
                ApiResponse.success("로그인에 성공했습니다.", response)
        );
    }

    /**
     * 이메일 중복 확인.  GET /auth/email-check?email=test@ex.com
     *
     * @RequestParam : URL 쿼리스트링의 email 값을 받는다.
     * @return { available: true } (사용 가능) / { available: false } (이미 사용 중)
     */
    @GetMapping("/email-check")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkEmail(
            @RequestParam String email
    ) {
        boolean available = authService.isEmailAvailable(email);
        return ResponseEntity.ok(
                ApiResponse.success("이메일 사용 가능 여부입니다.", Map.of("available", available))
        );
    }
}
