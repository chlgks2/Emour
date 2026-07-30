import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthHeader from "../components/layout/AuthHeader";
import TextField from "../components/common/TextField";
import Button from "../components/common/Button";
import SocialLoginButtons from "../components/auth/SocialLoginButtons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import logoIcon from "../assets/only-logo.png";
import styles from "./LoginPage.module.css";
import {
  hasCurrentCoupleRoom,
  saveCurrentCoupleRoom,
} from "../utils/pendingCoupleRoom.js";

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
  const getPostLoginPath = (user) => {
    if (user?.roomId) {
      saveCurrentCoupleRoom(
        {
          roomId: user.roomId,
          roomStatus:
            user.roomStatus ?? "ACTIVE",
        },
        user.userId,
      );

      return "/dashboard";
    }

    return hasCurrentCoupleRoom(user?.userId)
      ? "/dashboard"
      : "/couple/connect";
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
      navigate(getPostLoginPath(user), {
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
      navigate(getPostLoginPath(user), {
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
        <img src={logoIcon} alt="Emour" className={styles.heartIcon} />
        <h1 className={styles.title}>환영합니다!</h1>
        <p className={styles.subtitle}>이메일과 비밀번호로 로그인해주세요.</p>

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
