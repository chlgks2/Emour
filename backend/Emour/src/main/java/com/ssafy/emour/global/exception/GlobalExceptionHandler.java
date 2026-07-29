package com.ssafy.emour.global.exception;

import com.ssafy.emour.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 앱 전체에서 발생하는 예외를 한 곳에서 가로채, 공통 응답 형식으로 변환한다.
 * (@RestControllerAdvice = "모든 컨트롤러의 예외를 대신 처리하는 곳")
 *
 * 덕분에 각 서비스/컨트롤러는 그냥 예외를 "던지기만" 하면 되고,
 * 응답을 어떻게 내려줄지는 여기서 일괄 처리된다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 우리가 의도적으로 던진 예외 (CustomException) 처리
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException e) {
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.getMessage()));
    }

    // @Valid 검증 실패 (예: 이메일 형식 오류, 필수값 누락) 처리
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = (fieldError != null) ? fieldError.getDefaultMessage() : "잘못된 입력값입니다.";
        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    // 미처 예상하지 못한 나머지 모든 예외 처리 (서버 오류)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        return ResponseEntity
                .internalServerError()
                .body(ApiResponse.error("서버 오류가 발생했습니다."));
    }
}
