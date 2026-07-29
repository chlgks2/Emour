package com.ssafy.emour.member.entity;

/**
 * 회원 상태.
 * - ACTIVE   : 정상 활동 회원
 * - INACTIVE : 휴면 등 비활성
 * - WITHDRAWN: 탈퇴한 회원 (soft delete, deleted_at 과 함께 사용)
 */
public enum MemberStatus {
    ACTIVE,
    INACTIVE,
    WITHDRAWN
}
