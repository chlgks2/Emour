import { SOCIAL_PROVIDER } from "../../constants/enums";
import styles from "./SocialLoginButtons.module.css";

const SVGS = {
  kakao: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.708 4.8 4.27 6.054-.19.67-.683 2.42-.782 2.782-.124.453.152.447.32.335.132-.088 2.094-1.42 2.924-1.983.41.057.83.087 1.257.087 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.817 1.164 15.055 0 12 0 7.34 0 3.32 2.66 1.343 6.549l3.923 3.216z"/>
      <path fill="#4285F4" d="M23.682 12.23c0-.803-.068-1.58-.205-2.32H12v4.4h6.582a5.64 5.64 0 01-2.441 3.714v3.076h3.94c2.314-2.127 3.601-5.265 3.601-8.87z"/>
      <path fill="#FBBC05" d="M5.266 14.235a7.1 7.1 0 010-4.47L1.343 6.55A11.936 11.936 0 000 12c0 1.92.455 3.738 1.343 5.45l3.923-3.215z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.959-1.077 7.945-2.915l-3.94-3.076c-1.096.733-2.5 1.173-4.005 1.173-3.123 0-5.773-2.11-6.723-4.945L1.333 17.46A11.944 11.944 0 0012 24z"/>
    </svg>
  ),
};

// provider 는 social_login.provider 로 그대로 전달되는 값 (대문자)
// iconKey 는 위 SVGS 조회용 소문자 키
const PROVIDERS = [
  { provider: SOCIAL_PROVIDER.KAKAO, iconKey: "kakao", label: "카카오", className: "kakao" },
  { provider: SOCIAL_PROVIDER.GOOGLE, iconKey: "google", label: "구글", className: "google" },
];

export default function SocialLoginButtons({ onSelect, disabled, loadingProvider }) {
  return (
    <div className={styles.row}>
      {PROVIDERS.map(({ provider, iconKey, label, className }) => {
        const loading = loadingProvider === provider;
        return (
          <button
            key={provider}
            type="button"
            className={[styles.socialBtn, styles[className], loading ? styles.loading : ""].join(
              " "
            )}
            onClick={() => onSelect?.(provider)}
            disabled={disabled}
            aria-busy={loading}
          >
            <span className={styles.iconWrapper} aria-hidden="true">
              {SVGS[iconKey]}
            </span>
            {/* 글자를 눈에 보이게 둔다. 아이콘만으로는 눌러서 무엇을 하는지가 흐리다. */}
            <span>{label}로 로그인하기</span>
          </button>
        );
      })}
    </div>
  );
}