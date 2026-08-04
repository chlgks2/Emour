import { useEffect, useRef, useState } from "react";
import { SOCIAL_PROVIDER } from "../../../constants/enums";
import styles from "./SocialLoginButtons.module.css";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

let googleScriptPromise;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => resolve(window.google);
    const handleError = () => reject(new Error("Google 로그인 화면을 불러오지 못했어요."));

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return googleScriptPromise;
}

export default function SocialLoginButtons({ onSelect, disabled, loadingProvider }) {
  const googleButtonRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [setupError, setSetupError] = useState(() =>
    GOOGLE_CLIENT_ID ? "" : "Google 로그인을 사용하려면 Client ID 설정이 필요합니다.",
  );
  const loading = loadingProvider === SOCIAL_PROVIDER.GOOGLE;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then((google) => {
        if (cancelled || !googleButtonRef.current) return;

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => {
            if (credential) {
              onSelectRef.current?.(SOCIAL_PROVIDER.GOOGLE, credential);
            }
          },
          ux_mode: "popup",
          context: "signin",
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleButtonRef.current.replaceChildren();
        google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(420, googleButtonRef.current.clientWidth || 320),
          locale: "ko",
        });
      })
      .catch((error) => {
        if (!cancelled) setSetupError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.row}>
      <div
        className={[
          styles.googleButtonShell,
          disabled ? styles.disabled : "",
          loading ? styles.loading : "",
        ].join(" ")}
        aria-busy={loading}
      >
        <div ref={googleButtonRef} className={styles.googleButton} />
        {(disabled || setupError) && (
          <div className={styles.buttonBlocker} aria-hidden="true" />
        )}
      </div>

      {setupError && (
        <p className={styles.setupError} role="status">
          {setupError}
        </p>
      )}
    </div>
  );
}
