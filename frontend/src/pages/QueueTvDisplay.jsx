import { useState, useEffect, useRef, useCallback } from "react";
import "./QueueTvDisplay.css";

const API_URL = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
const POLL_INTERVAL = 2000;
const SLIDE_INTERVAL = 7000;

/* ── Indonesian number to words for TTS ── */
const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
const BELASAN = ["sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas", "enam belas", "tujuh belas", "delapan belas", "sembilan belas"];

function numberToWords(n) {
  if (n === 0) return "nol";
  if (n < 10) return SATUAN[n];
  if (n < 20) return BELASAN[n - 10];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return SATUAN[tens] + " puluh" + (ones ? " " + SATUAN[ones] : "");
  }
  if (n < 200) return "seratus" + (n % 100 ? " " + numberToWords(n % 100) : "");
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    return SATUAN[hundreds] + " ratus" + (n % 100 ? " " + numberToWords(n % 100) : "");
  }
  return String(n);
}

function getWeatherEmoji(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  return "⛈️";
}

function QueueTvDisplay() {
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [slideIndex, setSlideIndex] = useState(0);
  const [animatingCounters, setAnimatingCounters] = useState({});
  const [bellFlash, setBellFlash] = useState(false);
  const [weather, setWeather] = useState(null);
  const prevNumbersRef = useRef({});
  const ttsQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── TTS Engine ── */
  const speakAnnouncement = useCallback((counterCode, number) => {
    const paddedStr = String(number).padStart(3, '0');
    let numWord = "";
    if (paddedStr[0] === '0') {
        numWord += "nol ";
        if (paddedStr[1] === '0') {
            numWord += "nol ";
            numWord += numberToWords(parseInt(paddedStr[2]));
        } else {
            numWord += numberToWords(parseInt(paddedStr.substring(1)));
        }
    } else {
        numWord = numberToWords(number);
    }
    
    const text = `Nomor antrian ${counterCode} ${numWord}, silahkan Menuju Loket ${counterCode}`;

    ttsQueueRef.current.push(text);
    processNextTTS();
  }, []);

  const processNextTTS = useCallback(() => {
    if (isSpeakingRef.current || ttsQueueRef.current.length === 0) return;

    isSpeakingRef.current = true;
    const text = ttsQueueRef.current.shift();

    try {
      const synth = window.speechSynthesis;
      // Cancel any ongoing speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find an Indonesian voice
      const voices = synth.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith("id")) || voices.find(v => v.lang.startsWith("ms")) || null;
      if (idVoice) utterance.voice = idVoice;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        // Process next in queue after a short pause
        setTimeout(() => processNextTTS(), 500);
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setTimeout(() => processNextTTS(), 300);
      };

      synth.speak(utterance);
    } catch (e) {
      console.warn("TTS failed:", e);
      isSpeakingRef.current = false;
    }
  }, []);

  // Ensure voices are loaded
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = () => {};
    }
    synth.getVoices(); // trigger load
  }, []);

  /* ── Weather ── */
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-2.99&longitude=120.19&current=temperature_2m,weather_code&timezone=Asia/Makassar");
        if (res.ok) {
          const d = await res.json();
          setWeather({ temp: Math.round(d.current?.temperature_2m || 0), code: d.current?.weather_code || 0 });
        }
      } catch (e) { console.warn("Weather fetch failed", e); }
    };
    fetchWeather();
    const wTimer = setInterval(fetchWeather, 600000);
    return () => clearInterval(wTimer);
  }, []);

  /* ── Bell Sound ── */
  const playBellSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(830, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.6);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046, ctx.currentTime + 0.2);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.9);

      setTimeout(() => ctx.close(), 1500);
    } catch (e) {
      console.warn("Bell sound failed:", e);
    }
  }, []);

  /* ── Poll API ── */
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/public/queue-display`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        // Check for number changes on each counter
        const counters = json.counters || [];
        counters.forEach((counter) => {
          const prevNum = prevNumbersRef.current[counter.counter_code];
          if (prevNum !== undefined && counter.current_number !== prevNum && counter.current_number > 0) {
            // Number changed — animate + bell + TTS
            setAnimatingCounters((prev) => ({ ...prev, [counter.counter_code]: true }));
            setBellFlash(true);
            playBellSound();

            // TTS announcement after bell
            setTimeout(() => {
              speakAnnouncement(counter.counter_code, counter.current_number);
            }, 800);

            setTimeout(() => setAnimatingCounters((prev) => ({ ...prev, [counter.counter_code]: false })), 800);
            setTimeout(() => setBellFlash(false), 1000);
          }
          prevNumbersRef.current[counter.counter_code] = counter.current_number;
        });

        setData(json);
      } catch (e) {
        console.error("Queue poll failed:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [playBellSound, speakAnnouncement]);

  // Slideshow rotation — fixed interval
  useEffect(() => {
    const slides = data?.slideshow;
    if (!slides || slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [data?.slideshow?.length]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const counters = data?.counters || [];
  const hasAnyActive = counters.some((c) => c.status === "active");
  const hasSlides = data?.slideshow?.length > 0;

  return (
    <div className="qtv-page" onDoubleClick={toggleFullscreen}>
      {bellFlash && <div className="qtv-bell-flash" />}

      <div className="qtv-ambient">
        <div className="qtv-ambient-orb qtv-orb-1" />
        <div className="qtv-ambient-orb qtv-orb-2" />
        <div className="qtv-ambient-orb qtv-orb-3" />
      </div>
      <div className="qtv-grid-overlay" />

      {/* ── Header ── */}
      <header className="qtv-header">
        <div className="qtv-header-brand">
          <img src="/logo/logo.png" alt="BPOM" className="qtv-header-logo" />
          <div className="qtv-header-text">
            <h1>Layanan Unit Pelayanan Publik</h1>
            <span>Balai POM di Palopo</span>
          </div>
        </div>

        <div className="qtv-header-center">
          {weather && (
            <div className="qtv-status-badge active">
              <span>{getWeatherEmoji(weather.code)}</span>
              {weather.temp}°C — Palopo
            </div>
          )}
        </div>

        <div className="qtv-header-clock">
          <div className="qtv-clock-time">
            {currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="qtv-clock-date">
            {currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="qtv-main">
        {/* Left Panel — Queue Counters */}
        <div className="qtv-left">
          {hasAnyActive || counters.length > 0 ? (
            <div className="qtv-counters-grid">
              {counters.map((counter) => (
                <CounterCard
                  key={counter.counter_code}
                  counter={counter}
                  isAnimating={animatingCounters[counter.counter_code]}
                />
              ))}
            </div>
          ) : (
            <div className="qtv-closed-state">
              <div className="qtv-closed-icon">🏢</div>
              <div className="qtv-closed-text">Loket Sedang Tutup</div>
              <div className="qtv-closed-sub">Layanan akan dibuka sesuai jam operasional</div>
            </div>
          )}
        </div>

        {/* Right Panel — Slideshow */}
        <div className="qtv-right">
          <div className="qtv-slide-container">
            {hasSlides ? (
              <>
                {data.slideshow.map((slide, idx) => (
                  <div key={idx} className={`qtv-slide ${idx === slideIndex ? "active" : ""}`}>
                    {slide.image?.endsWith(".mp4") ? (
                      <video src={slide.image} autoPlay muted loop playsInline />
                    ) : (
                      <img src={slide.image} alt={slide.title || `Slide ${idx + 1}`} />
                    )}
                    {slide.title && <div className="qtv-slide-title">{slide.title}</div>}
                  </div>
                ))}
                {data.slideshow.length > 1 && (
                  <div className="qtv-slide-dots">
                    {data.slideshow.map((_, idx) => (
                      <div key={idx} className={`qtv-slide-dot ${idx === slideIndex ? "active" : ""}`} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="qtv-slide-empty">
                <div className="qtv-slide-empty-icon">📺</div>
                <span>Slideshow Informasi</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Ticker ── */}
      {data?.ticker_text && (
        <div className="qtv-ticker">
          <div className="qtv-ticker-label"><span>📢</span> INFO</div>
          <div className="qtv-ticker-content">
            <span className="qtv-ticker-scroll">
              {data.ticker_text} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {data.ticker_text}
            </span>
          </div>
        </div>
      )}

      <button className="qtv-fullscreen-btn" onClick={toggleFullscreen} title="Fullscreen">⛶</button>
    </div>
  );
}

/* ── Counter Card Component ── */
function CounterCard({ counter, isAnimating }) {
  const isActive = counter.status === "active";
  const code = counter.counter_code;
  const colorClass = code === "A" ? "counter-a" : "counter-b";
  const description = counter.counter_name || (code === "A" ? "Layanan Pengaduan dan Informasi" : "Layanan Sertifikasi/Pendampingan");

  if (!isActive) {
    return (
      <div className={`qtv-counter-card ${colorClass} closed`}>
        <div className="qtv-counter-header">
          <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px'}}>
            <span className="qtv-counter-code">{code}</span>
            <span style={{fontSize: '12px', fontWeight: '600', color: 'var(--qtv-text-secondary)'}}>{description}</span>
          </div>
          <span className="qtv-counter-status-label">Tutup</span>
        </div>
        <div className="qtv-counter-closed-msg">Loket {code} tutup</div>
      </div>
    );
  }

  return (
    <div className={`qtv-counter-card ${colorClass}`}>
      <div className="qtv-counter-header">
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px'}}>
          <span className="qtv-counter-code">{code}</span>
          <span style={{fontSize: '12px', fontWeight: '600', color: 'var(--qtv-text-secondary)'}}>{description}</span>
        </div>
        <span className="qtv-counter-status-label active">Buka</span>
      </div>

      <div className="qtv-counter-number-wrap">
        <div className={`qtv-counter-number ${isAnimating ? "animate-change" : ""}`}>
          {code}-{String(counter.current_number || 0).padStart(3, "0")}
        </div>
        <div className="qtv-counter-number-sub">Sedang Dilayani</div>
      </div>

      {counter.employee_name && (
        <div className="qtv-counter-officer">
          {counter.employee_photo ? (
            <img
              src={counter.employee_photo}
              alt={counter.employee_name}
              className="qtv-counter-officer-photo"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="qtv-counter-officer-placeholder">
              {(counter.employee_name?.[0] || "?").toUpperCase()}
            </div>
          )}
          <div className="qtv-counter-officer-info">
            <div className="qtv-counter-officer-label">Petugas</div>
            <div className="qtv-counter-officer-name">{counter.employee_name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueTvDisplay;
