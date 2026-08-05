import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import styles from "./AuthHeader.module.css";

export default function AuthHeader({ fallbackTo = "/login", showBack = true }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackTo);
  };

  return (
    <header className={styles.header}>
      {showBack && <button
        type="button"
        className={styles.backBtn}
        onClick={handleBack}
        aria-label="뒤로가기"
      >
        <ChevronLeft size={24} />
      </button>}
    </header>
  );
}
