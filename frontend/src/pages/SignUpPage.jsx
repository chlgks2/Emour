import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthHeader from "../components/layout/AuthHeader";
import TextField from "../components/common/TextField";
import Button from "../components/common/Button";
import { checkEmailDuplicate, signUp } from "../api/authApi";
import { useToast } from "../hooks/useToast";
import logoIcon from "../assets/logo-icon.png";
import styles from "./SignUpPage.module.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const NICKNAME_MAX_LENGTH = 50; // user.nickname VARCHAR(50)
const EMAIL_MAX_LENGTH = 255; // user.email VARCHAR(255)

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
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (key === "email") {
      // 이메일을 고치면 이전 중복확인 결과는 무효
      setEmailChecked(false);
      setEmailCheckMsg("");
    }
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleCheckDuplicate = async () => {
    if (!EMAIL_REGEX.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: "올바른 이메일 형식을 입력해주세요." }));
      return;
    }
    setCheckingEmail(true);
    try {
      const { available } = await checkEmailDuplicate(form.email);
      setEmailChecked(available);
      setEmailCheckMsg(available ? "사용 가능한 이메일이에요." : "");
      setErrors((prev) => ({
        ...prev,
        email: available ? undefined : "이미 사용 중인 이메일이에요.",
      }));
    } catch {
      setErrors((prev) => ({ ...prev, email: "중복 확인에 실패했어요. 다시 시도해주세요." }));
    } finally {
      setCheckingEmail(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!EMAIL_REGEX.test(form.email)) next.email = "올바른 이메일 형식을 입력해주세요.";
    else if (!emailChecked) next.email = "이메일 중복확인을 먼저 진행해주세요.";
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      next.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`;
    }
    if (form.passwordConfirm !== form.password) next.passwordConfirm = "비밀번호가 일치하지 않아요.";
    if (!form.nickname.trim()) next.nickname = "닉네임을 입력해주세요.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp({
        email: form.email,
        password: form.password,
        nickname: form.nickname.trim(),
      });
      showToast("회원가입이 완료되었어요!", { tone: "success" });
      navigate("/login", { state: { justSignedUp: true } });
    } catch (err) {
      setErrors((prev) => ({ ...prev, email: err.message }));
    } finally {
      setSubmitting(false);
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
        <img src={logoIcon} alt="Emour" className={styles.heartIcon} />
        <h1 className={styles.title}>커플을 위한 특별한 시작</h1>
        <p className={styles.subtitle}>회원정보를 입력해주세요.</p>

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
            rightSlot={
              <Button
                type="button"
                variant="chip"
                fullWidth={false}
                loading={checkingEmail}
                disabled={!form.email || emailChecked}
                onClick={handleCheckDuplicate}
              >
                {emailChecked ? "확인완료" : "중복확인"}
              </Button>
            }
          />
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
            hint="상대방에게 보여지는 이름이에요."
          />
        </div>

        <Button type="submit" loading={submitting} className={styles.submitBtn}>
          회원가입
        </Button>

        <p className={styles.loginLink}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </form>
    </div>
  );
}
