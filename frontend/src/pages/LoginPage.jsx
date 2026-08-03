import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthHeader from "../components/layout/AuthHeader";
import TextField from "../components/common/TextField";
import Button from "../components/common/Button";
import SocialLoginButtons from "../components/auth/SocialLoginButtons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import logoWordmark from "../assets/logo-wordmark.svg";
import styles from "./LoginPage.module.css";
import {
  clearPendingCoupleRoom,
  getCurrentCoupleRoom,
  saveCurrentCoupleRoom,
} from "../utils/pendingCoupleRoom.js";
import {
  getMyCoupleRoom,
} from "../api/coupleApi.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithSocial } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const justSignedUp = location.state?.justSignedUp;
  const getPostLoginPath = async (user) => {
    const serverRoom =
      await getMyCoupleRoom();

    if (serverRoom?.roomId) {
      const storedRoom =
        getCurrentCoupleRoom();

      saveCurrentCoupleRoom(
        {
          ...storedRoom,
          ...serverRoom,
        },
        user.userId,
      );

      return serverRoom.status === "WAITING"
        ? "/mypage"
        : "/dashboard";
    }

    clearPendingCoupleRoom();

    return "/couple/connect";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      showToast(`${user.nickname}님, 환영해요!`, { tone: "success" });
      const postLoginPath =
        await getPostLoginPath(user);
      navigate(postLoginPath, {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocial = async (provider) => {
    setSocialLoading(provider);
    setError("");
    try {
      const user =
        await loginWithSocial(provider);
      const postLoginPath =
        await getPostLoginPath(user);
      navigate(postLoginPath, {
        replace: true,
      });
    } catch {
      setError("소셜 로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="app-shell">
      <AuthHeader fallbackTo="/login" />
      <form className={styles.content} onSubmit={handleSubmit} noValidate>
        <img src={logoWordmark} alt="Emour" className={styles.logo} />
        <h1 className={styles.title}>다시 만나서 반가워요</h1>
        <p className={styles.subtitle}>오늘 두 사람의 감정을 이어가 볼까요?</p>

        {justSignedUp && (
          <p className={styles.noticeBanner} role="status">
            회원가입이 완료되었어요. 로그인해주세요!
          </p>
        )}

        <div className={styles.fields}>
          <TextField
            label="이메일"
            placeholder="이메일을 입력해주세요."
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="비밀번호"
            placeholder="비밀번호를 입력해주세요."
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
        </div>

        <Button type="submit" loading={submitting} className={styles.submitBtn}>
          로그인
        </Button>

        <div className={styles.helperLinks}>
          <Link to="/find-id">아이디 찾기</Link>
          <span className={styles.divider} aria-hidden="true">
            |
          </span>
          <Link to="/find-password">비밀번호 찾기</Link>
        </div>

        <div className={styles.orDivider}>
          <span aria-hidden="true" />
          또는
          <span aria-hidden="true" />
        </div>

        <SocialLoginButtons
          onSelect={handleSocial}
          disabled={Boolean(socialLoading) || submitting}
          loadingProvider={socialLoading}
        />

        <p className={styles.signupLink}>
          아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>

        {/* 목업 단계에서 데모 계정을 안내 (백엔드 연동 시 이 블록만 삭제) */}
        {import.meta.env.DEV && (
          <p className={styles.demoHint}>
            데모 계정 · demo@emour.app / demo1234
          </p>
        )}
      </form>
    </div>
  );
}
