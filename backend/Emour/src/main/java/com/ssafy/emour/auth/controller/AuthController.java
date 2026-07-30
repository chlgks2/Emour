package com.ssafy.emour.auth.controller;

import com.ssafy.emour.auth.dto.request.EmailSendRequest;
import com.ssafy.emour.auth.dto.request.EmailVerifyRequest;
import com.ssafy.emour.auth.dto.request.LoginRequest;
import com.ssafy.emour.auth.dto.request.PasswordResetRequest;
import com.ssafy.emour.auth.dto.request.SignUpRequest;
import com.ssafy.emour.auth.dto.request.TokenReissueRequest;
import com.ssafy.emour.auth.dto.response.LoginResponse;
import com.ssafy.emour.auth.dto.response.SignUpResponse;
import com.ssafy.emour.auth.dto.response.TokenResponse;
import com.ssafy.emour.auth.service.AuthService;
import com.ssafy.emour.global.response.ApiResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
@Validated
@Tag(name = "Authentication", description = "회원가입, 로그인 및 토큰 관리 API")
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
    @Operation(
            summary = "이메일 로그인",
            description = "이메일과 비밀번호를 입력하면 Access Token과 Refresh Token을 발급합니다."
    )
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Parameter(
                    name = "email",
                    description = "로그인할 회원의 이메일",
                    required = true,
                    in = ParameterIn.QUERY,
                    example = "test@example.com"
            )
            @RequestParam
            @NotBlank(message = "이메일은 필수입니다.")
            @Email(message = "이메일 형식이 아닙니다.")
            String email,

            @Parameter(
                    name = "password",
                    description = "로그인할 회원의 비밀번호",
                    required = true,
                    in = ParameterIn.QUERY,
                    example = "password123!"
            )
            @RequestParam
            @NotBlank(message = "비밀번호는 필수입니다.")
            String password
    ) {
        // 서비스는 기존 DTO를 사용하므로 로그인 비즈니스 로직은 그대로 유지됩니다.
        LoginRequest request = new LoginRequest(email, password);
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(
                ApiResponse.success("로그인에 성공했습니다.", response)
        );
    }

    /**
     * 비밀번호 재설정 코드 발송.  POST /auth/password/email
     */
    @PostMapping("/password/email")
    public ResponseEntity<ApiResponse<Void>> sendPasswordResetCode(
            @Valid @RequestBody EmailSendRequest request
    ) {
        authService.sendPasswordResetCode(request.email());
        return ResponseEntity.ok(ApiResponse.success("인증코드를 발송했습니다."));
    }

    /**
     * 비밀번호 재설정 코드 확인.  POST /auth/password/verify
     */
    @PostMapping("/password/verify")
    public ResponseEntity<ApiResponse<Void>> verifyPasswordResetCode(
            @Valid @RequestBody EmailVerifyRequest request
    ) {
        authService.verifyPasswordResetCode(request.email(), request.code());
        return ResponseEntity.ok(ApiResponse.success("인증코드가 확인되었습니다."));
    }

    /**
     * 비밀번호 재설정.  PATCH /auth/password
     */
    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody PasswordResetRequest request
    ) {
        authService.resetPassword(request.email(), request.code(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다."));
    }

    /**
     * 이메일 인증코드 발송.  POST /auth/email/send
     */
    @PostMapping("/email/send")
    public ResponseEntity<ApiResponse<Void>> sendEmailCode(
            @Valid @RequestBody EmailSendRequest request
    ) {
        authService.sendSignUpVerificationCode(request.email());
        return ResponseEntity.ok(ApiResponse.success("인증코드를 발송했습니다."));
    }

    /**
     * 이메일 인증코드 확인.  POST /auth/email/verify
     */
    @PostMapping("/email/verify")
    public ResponseEntity<ApiResponse<Void>> verifyEmailCode(
            @Valid @RequestBody EmailVerifyRequest request
    ) {
        authService.verifySignUpCode(request.email(), request.code());
        return ResponseEntity.ok(ApiResponse.success("이메일 인증이 완료되었습니다."));
    }

    /**
     * Access Token 재발급.  POST /auth/refresh
     * body 로 받은 refreshToken 이 유효하면 새 accessToken 을 돌려준다. (로그인 불필요)
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> reissue(
            @Valid @RequestBody TokenReissueRequest request
    ) {
        TokenResponse response = authService.reissue(request.refreshToken());
        return ResponseEntity.ok(
                ApiResponse.success("토큰이 재발급되었습니다.", response)
        );
    }

    /**
     * 로그아웃.  POST /auth/logout  (로그인 상태 필수)
     * 헤더의 access 토큰으로 "누가 로그아웃하는지" 알아내 Redis 의 refresh 토큰을 삭제한다.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        authService.logout(SecurityUtil.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("로그아웃 되었습니다."));
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
