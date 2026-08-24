import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const ReCaptcha = forwardRef(({ onChange, sitekey }, ref) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const reset = () => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
    onChange(null);
  };

  useImperativeHandle(ref, () => ({
    reset,
  }));

  useEffect(() => {
    const initRecaptcha = () => {
      if (window.grecaptcha && containerRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: sitekey,
            callback: (token) => {
              onChange(token);
            },
            'expired-callback': () => {
              onChange(null);
            },
            'error-callback': () => {
              onChange(null);
            },
          });
        } catch (err) {
          console.error("Failed to render reCAPTCHA widget:", err);
        }
      }
    };

    if (!window.grecaptcha) {
      const scriptId = 'recaptcha-script-tag';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const interval = setInterval(() => {
            if (window.grecaptcha && window.grecaptcha.render) {
              clearInterval(interval);
              initRecaptcha();
            }
          }, 100);
        };
        document.body.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.grecaptcha && window.grecaptcha.render) {
            clearInterval(interval);
            initRecaptcha();
          }
        }, 100);
      }
    } else {
      initRecaptcha();
    }

    return () => {
      widgetIdRef.current = null;
    };
  }, [sitekey, onChange]);

  return (
    <div className="recaptcha-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
      <div ref={containerRef} />
    </div>
  );
});

ReCaptcha.displayName = 'ReCaptcha';

export default ReCaptcha;
