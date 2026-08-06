import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "../../components/layout/AuthHeader/AuthHeader";
import TextField from "../../components/common/TextField/TextField";
import Button from "../../components/common/Button/Button";
import {
  resetPassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from "../../api/authApi";
import { useToast } from "../../hooks/useToast";
import logoMark from "../../assets/logo-mark.svg";
import styles from "./PasswordResetPage.module.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setSubmitting(true);

      if (step === "EMAIL") {
        if (!EMAIL_REGEX.test(email)) {
          setError("올바른 이메일 형식을 입력해주세요.");
          return;
        }
        await sendPasswordResetCode(email);
        setStep("CODE");
        showToast("인증 코드를 전송했어요.", { tone: "success" });
        return;
      }

      if (step === "CODE") {
        if (!code.trim()) {
          setError("인증 코드를 입력해주세요.");
          return;
        }
        await verifyPasswordResetCode({ email, code });
        setStep("PASSWORD");
        return;
      }

      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        setError(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`);
        return;
      }
      if (newPassword.length > PASSWORD_MAX_LENGTH) {
        setError(`비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`);
        return;
      }
      if (newPassword !== passwordConfirm) {
        setError("비밀번호가 일치하지 않아요.");
        return;
      }

      await resetPassword({ email, code, newPassword });
      showToast("비밀번호가 변경되었어요. 다시 로그인해주세요.", {
        tone: "success",
      });
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "요청을 처리하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    step === "EMAIL"
      ? "비밀번호 찾기"
      : step === "CODE"
        ? "인증 코드 확인"
        : "새 비밀번호 설정";

  return (
    <div className="app-shell">
      <AuthHeader fallbackTo="/login" />
      <form className={styles.content} onSubmit={handleSubmit} noValidate>
        <img src={logoMark} alt="Emour" className={styles.logo} />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>
          {step === "EMAIL"
            ? "가입한 이메일로 인증 코드를 보내드려요."
            : step === "CODE"
              ? `${email}로 받은 인증 코드를 입력해주세요.`
              : "앞으로 사용할 새 비밀번호를 입력해주세요."}
        </p>

        <div className={styles.fields}>
          {step === "EMAIL" && (
            <TextField
              label="이메일"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={error}
            />
          )}

          {step === "CODE" && (
            <TextField
              label="인증 코드"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              error={error}
            />
          )}

          {step === "PASSWORD" && (
            <>
              <TextField
                label="새 비밀번호"
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <TextField
                label="새 비밀번호 확인"
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                error={error}
              />
            </>
          )}
        </div>

        <Button type="submit" loading={submitting} className={styles.submitButton}>
          {step === "EMAIL" ? "인증 코드 받기" : step === "CODE" ? "인증하기" : "변경하기"}
        </Button>
      </form>
    </div>
  );
}
