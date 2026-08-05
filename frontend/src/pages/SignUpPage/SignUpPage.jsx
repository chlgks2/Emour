import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AuthHeader from "../../components/layout/AuthHeader/AuthHeader";
import TextField from "../../components/common/TextField/TextField";
import Button from "../../components/common/Button/Button";
import {
  checkEmailDuplicate,
  sendEmailCode,
  signUp,
  verifyEmailCode,
} from "../../api/authApi";
import { useToast } from "../../hooks/useToast";
import logoMark from "../../assets/logo-mark.svg";
import styles from "./SignUpPage.module.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 8;
const EMAIL_MAX_LENGTH = 255; // user.email VARCHAR(255)
const VERIFICATION_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_VALID_SECONDS = 5 * 60;

export default function SignUpPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
  });
  const [errors, setErrors] = useState({});
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 이메일 입력 → 인증번호 확인 → 회원정보 입력 순서로 진행한다.
  // 백엔드도 인증 완료 상태가 있어야 /auth/signup 을 허용한다.
  const [step, setStep] = useState("EMAIL");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [verificationSeconds, setVerificationSeconds] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (verificationSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setVerificationSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [verificationSeconds]);

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (key === "email") {
      // 이메일을 고치면 이전 중복확인 결과는 무효
      setEmailChecked(false);
      setEmailCheckMsg("");
    }
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!EMAIL_REGEX.test(form.email)) next.email = "올바른 이메일 형식을 입력해주세요.";
    else if (!emailChecked) next.email = "이메일 중복확인을 먼저 진행해주세요.";
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      next.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`;
    }
    if (form.passwordConfirm !== form.password) next.passwordConfirm = "비밀번호가 일치하지 않아요.";
    const nicknameLength = form.nickname.trim().length;
    if (!nicknameLength) next.nickname = "닉네임을 입력해주세요.";
    else if (nicknameLength < NICKNAME_MIN_LENGTH) {
      next.nickname = `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 입력해주세요.`;
    } else if (nicknameLength > NICKNAME_MAX_LENGTH) {
      next.nickname = `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === "EMAIL") {
      if (!EMAIL_REGEX.test(form.email)) {
        setErrors((prev) => ({ ...prev, email: "올바른 이메일 형식을 입력해주세요." }));
        return;
      }

      setSubmitting(true);
      try {
        const { available } = await checkEmailDuplicate(form.email);
        if (!available) {
          setErrors((prev) => ({ ...prev, email: "이미 사용 중인 이메일이에요." }));
          return;
        }

        setEmailChecked(true);
        setEmailCheckMsg("사용 가능한 이메일이에요.");
        await sendEmailCode(form.email);
        setVerificationCode("");
        setVerificationError("");
        setResendSeconds(RESEND_COOLDOWN_SECONDS);
        setVerificationSeconds(VERIFICATION_VALID_SECONDS);
        setStep("VERIFY");
        showToast("인증 코드를 이메일로 전송했어요.", { tone: "success" });
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          email: err.message || "인증 코드 발송에 실패했어요.",
        }));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step === "VERIFY") {
      if (verificationCode.length !== VERIFICATION_CODE_LENGTH) {
        setVerificationError("6자리 인증 코드를 입력해주세요.");
        return;
      }

      if (verificationSeconds <= 0) {
        setVerificationError("인증 시간이 만료되었어요. 인증 코드를 다시 받아주세요.");
        return;
      }

      setSubmitting(true);
      setVerificationError("");
      try {
        await verifyEmailCode({ email: form.email, code: verificationCode });
        showToast("이메일 인증이 완료되었어요!", { tone: "success" });
        setStep("DETAILS");
      } catch (err) {
        setVerificationError(err.message || "인증 코드를 확인해주세요.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp({
        email: form.email,
        password: form.password,
        nickname: form.nickname.trim(),
      });
      showToast("회원가입이 완료되었어요.", { tone: "success" });
      navigate("/login", { state: { justSignedUp: true } });
    } catch (err) {
      const message = err.message || "회원가입을 처리하지 못했어요.";

      if (message.includes("닉네임")) {
        setErrors((prev) => ({ ...prev, nickname: message }));
      } else if (message.includes("비밀번호")) {
        setErrors((prev) => ({ ...prev, password: message }));
      } else {
        setErrors((prev) => ({ ...prev, email: message }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerificationCodeChange = (event) => {
    const digits = event.target.value
      .replace(/\D/g, "")
      .slice(0, VERIFICATION_CODE_LENGTH);
    setVerificationCode(digits);
    setVerificationError("");
  };

  const handleResendCode = async () => {
    if (resending || resendSeconds > 0) return;

    setResending(true);
    setVerificationError("");
    try {
      await sendEmailCode(form.email);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setVerificationSeconds(VERIFICATION_VALID_SECONDS);
      showToast("인증 코드를 다시 전송했어요.", { tone: "success" });
    } catch (err) {
      setVerificationError(err.message || "인증 코드 재전송에 실패했어요.");
    } finally {
      setResending(false);
    }
  };

  // 확인란을 입력하는 중에 실시간으로 일치 여부를 알려준다.
  const passwordConfirmSuccess =
    form.passwordConfirm && form.passwordConfirm === form.password
      ? "비밀번호가 일치해요."
      : undefined;

  return (
    <div className="app-shell">
      <AuthHeader fallbackTo="/login" />
      <form className={styles.content} onSubmit={handleSubmit} noValidate>
        <img src={logoMark} alt="Emour" className={styles.heartIcon} />
        <h1 className={styles.title}>
          {step === "EMAIL"
            ? "이메일로 시작하기"
            : step === "VERIFY"
              ? "이메일 인증"
              : "회원정보 입력"}
        </h1>
        <p className={styles.subtitle}>
          {step === "EMAIL"
            ? "가입할 이메일을 먼저 인증해주세요."
            : step === "VERIFY"
              ? `${form.email}로 보낸 인증 코드를 입력해주세요.`
              : "인증된 이메일로 사용할 정보를 입력해주세요."}
        </p>

        {step === "EMAIL" ? (
          <div className={styles.fields}>
            <TextField
              label="이메일"
              placeholder="이메일을 입력해주세요."
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              maxLength={EMAIL_MAX_LENGTH}
              value={form.email}
              onChange={updateField("email")}
              error={errors.email}
              success={emailCheckMsg}
            />
          </div>
        ) : step === "DETAILS" ? (
        <div className={styles.fields}>
          <div className={styles.verifiedEmail}>
            <span>인증된 이메일</span>
            <strong>{form.email}</strong>
          </div>
          <TextField
            label="비밀번호"
            placeholder="비밀번호를 입력해주세요."
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={updateField("password")}
            error={errors.password}
            hint={`${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`}
          />
          <TextField
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력해주세요."
            type="password"
            name="passwordConfirm"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={updateField("passwordConfirm")}
            error={errors.passwordConfirm}
            success={passwordConfirmSuccess}
          />
          <TextField
            label="닉네임"
            placeholder="닉네임을 입력해주세요."
            name="nickname"
            autoComplete="nickname"
            maxLength={NICKNAME_MAX_LENGTH}
            value={form.nickname}
            onChange={updateField("nickname")}
            error={errors.nickname}
            hint="상대방에게 보이는 이름이에요."
          />
        </div>
        ) : (
          <div className={styles.fields}>
            <TextField
              label="인증 코드"
              placeholder="6자리 숫자"
              name="verificationCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={VERIFICATION_CODE_LENGTH}
              value={verificationCode}
              onChange={handleVerificationCodeChange}
              error={verificationError}
              rightSlot={
                <Button
                  type="button"
                  variant="chip"
                  fullWidth={false}
                  className={styles.resendButton}
                  loading={resending}
                  disabled={resendSeconds > 0}
                  onClick={handleResendCode}
                >
                  {resendSeconds > 0 ? `재전송 ${resendSeconds}초` : "재전송"}
                </Button>
              }
            />
            <p className={styles.verificationHint}>
              인증 코드 유효시간 {String(Math.floor(verificationSeconds / 60)).padStart(2, "0")}:
              {String(verificationSeconds % 60).padStart(2, "0")}
              <br />메일이 보이지 않으면 스팸함도 확인해주세요.
            </p>
          </div>
        )}

        <Button type="submit" loading={submitting} className={styles.submitBtn}>
          {step === "EMAIL"
            ? "인증 코드 받기"
            : step === "VERIFY"
              ? "인증하기"
              : "회원가입 완료"}
        </Button>

        {step === "VERIFY" && (
          <button
            type="button"
            className={styles.changeEmailButton}
            onClick={() => {
              setStep("EMAIL");
              setVerificationCode("");
              setVerificationError("");
              setVerificationSeconds(0);
            }}
          >
            이메일 다시 입력하기
          </button>
        )}

        {step === "EMAIL" && (
          <p className={styles.loginLink}>
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        )}
      </form>
    </div>
  );
}
