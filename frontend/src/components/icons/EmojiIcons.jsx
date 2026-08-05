// 부트스트랩 아이콘 스타일(선 굵기 1.5, outline)을 참고해 자체 제작한 심플 라인 이모지.
// 폰트 이모지(윈도우 기본 등) 대신 SVG로 렌더링되어 플랫폼에 상관없이 동일하게 보입니다.

export function EmojiFrownIcon({ size = 22, color = "currentColor", className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth="1.5" />
      <circle cx="8.5" cy="10" r="1.1" fill={color} />
      <circle cx="15.5" cy="10" r="1.1" fill={color} />
      <path
        d="M8.3 16.2c.9-1.5 2.2-2.3 3.7-2.3s2.8.8 3.7 2.3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmojiSmileIcon({ size = 22, color = "currentColor", className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth="1.5" />
      <circle cx="8.5" cy="10" r="1.1" fill={color} />
      <circle cx="15.5" cy="10" r="1.1" fill={color} />
      <path
        d="M7.8 13.6c1 1.7 2.4 2.6 4.2 2.6s3.2-.9 4.2-2.6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
