package com.ssafy.emour.global.response;

import lombok.Getter;

/**
 * 모든 API 응답을 감싸는 공통 형식.
 * 팀 규약: { success, message, data }
 *
 * 사용 예)
 *   return ApiResponse.success(data);                 // 성공 + 데이터
 *   return ApiResponse.success("가입 완료", data);     // 성공 + 메시지 + 데이터
 *   return ApiResponse.success("로그아웃 되었습니다."); // 성공 + 메시지만
 */
@Getter
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;

    private ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "요청에 성공했습니다.", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static ApiResponse<Void> success(String message) {
        return new ApiResponse<>(true, message, null);
    }

    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
