import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Spin,
  Tag,
  Button,
  Form,
  Input,
  Radio,
  message,
  Card,
  Space,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  QrcodeOutlined,
  CompassOutlined,
  CopyOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../hooks/useAuth.js";
import "./PublicEInvitationPage.css";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API_URL = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";

const getMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  let cleanUrl = url;
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl.replace(/\/storage\//i, "/api/media/");
  }
  cleanUrl = cleanUrl.startsWith("/") ? cleanUrl : "/" + cleanUrl;
  if (cleanUrl.startsWith("/storage/")) {
    cleanUrl = cleanUrl.replace("/storage/", "/api/media/");
  }
  const apiBase = API_URL.replace(/\/api\/?$/, "");
  return `${apiBase}${cleanUrl}`;
};

function TypingText({ text = "", speed = 30, className = "", style = {}, tag: TagName = "span", delay = 0 }) {
  const [displayedText, setDisplayedText] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        });
      },
      { threshold: 0.15 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted || !text) return;
    let index = 0;
    setDisplayedText("");

    const timeoutId = setTimeout(() => {
      const intervalId = setInterval(() => {
        index++;
        setDisplayedText(text.slice(0, index));
        if (index >= text.length) {
          clearInterval(intervalId);
        }
      }, speed);

      return () => clearInterval(intervalId);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [hasStarted, text, speed, delay]);

  return (
    <TagName ref={elementRef} className={`typing-text-wrapper ${className}`} style={style}>
      {hasStarted ? displayedText : ""}
      {hasStarted && displayedText.length < text.length && (
        <span className="typing-cursor">|</span>
      )}
    </TagName>
  );
}

export default function PublicEInvitationPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("to") || searchParams.get("token") || "";
  const { apiFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [guest, setGuest] = useState(null);
  const [wishes, setWishes] = useState([]);

  // Pane & Gate Door State
  const [isOpenPane, setIsOpenPane] = useState(false);

  // RSVP Form
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpForm] = Form.useForm();

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Canvas Ref
  const canvasRef = useRef(null);

  // Animated Neural Cyber Canvas Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particles & links
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 240, 255, 0.6)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.18 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fetchPublicInvitation = async () => {
    setLoading(true);
    try {
      let endpoint = `/public/e-invitations/${slug}`;
      if (tokenParam) endpoint += `?to=${encodeURIComponent(tokenParam)}`;

      const res = await apiFetch(endpoint);
      const contentType = res.headers.get("content-type");

      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        setInvitation(null);
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        const { invitation: inv, guest: g, wishes: w } = json.data;
        setInvitation(inv);
        setGuest(g);
        setWishes(w || []);

        if (g) {
          rsvpForm.setFieldsValue({
            guest_name: g.guest_name,
            guest_institution: g.guest_institution || "",
            guest_email: g.guest_email || "",
            guest_phone: g.guest_phone || "",
            rsvp_status: g.rsvp_status !== "pending" ? g.rsvp_status : "attending",
            pax_count: g.pax_count || 1,
            wishes_or_notes: g.wishes_or_notes || "",
          });
        }
      } else {
        setInvitation(null);
      }
    } catch (err) {
      console.error("fetchPublicInvitation error:", err);
      setInvitation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicInvitation();
  }, [slug, tokenParam]);

  // Countdown timer logic
  useEffect(() => {
    if (!invitation?.event_date) return;

    const targetDate = dayjs(`${invitation.event_date} ${invitation.event_time_start || "08:00"}`);

    const interval = setInterval(() => {
      const now = dayjs();
      const diffSec = targetDate.diff(now, "second");

      if (diffSec <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const days = Math.floor(diffSec / (3600 * 24));
        const hours = Math.floor((diffSec % (3600 * 24)) / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = Math.floor(diffSec % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation]);

  const handleOpenInvitation = () => {
    setIsOpenPane(true);
  };

  const handleFormFinish = async (values) => {
    setSubmittingRsvp(true);
    try {
      const payload = {
        ...values,
        token: guest ? guest.token : tokenParam,
      };

      const res = await apiFetch(`/public/e-invitations/${slug}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        message.error("Gagal menyimpan konfirmasi");
        return;
      }

      const json = await res.json();
      if (json.success) {
        message.success(json.message);
        if (json.data) setGuest(json.data);
        fetchPublicInvitation();
      } else {
        message.error(json.message || "Gagal menyimpan konfirmasi");
      }
    } catch (err) {
      message.error("Terjadi kesalahan jaringan");
    } finally {
      setSubmittingRsvp(false);
    }
  };

  const copyAddress = () => {
    if (!invitation) return;
    const addr = invitation.location_address || invitation.location_name || "Kantor Pusat BPOM RI";
    navigator.clipboard.writeText(addr);
    message.success("Alamat lokasi berhasil disalin!");
  };

  if (loading) {
    return (
      <div className="public-invitation-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text style={{ color: "#00f0ff", fontWeight: 700 }}>Memuat Undangan Digital BPOM...</Text>
        </Space>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="public-invitation-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 400, textAlign: "center", borderRadius: 16, background: "rgba(15,23,42,0.9)", border: "1px solid #00f0ff" }}>
          <CloseCircleOutlined style={{ fontSize: 48, color: "#ef4444", marginBottom: 12 }} />
          <Title level={4} style={{ color: "#fff" }}>Undangan Tidak Ditemukan</Title>
          <Paragraph style={{ color: "#94a3b8" }}>
            Tautan undangan digital yang Anda akses tidak ditemukan atau belum dipublikasikan.
          </Paragraph>
        </Card>
      </div>
    );
  }

  return (
    <div className={`public-invitation-root ${isOpenPane ? "unlocked" : ""}`}>
      {/* Background Video or Image Layer */}
      {invitation.background_type === "video" || (invitation.background_video_url && invitation.background_video_url.match(/\.(mp4|webm|ogg)$/i)) ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="background-video-element"
          src={getMediaUrl(invitation.background_video_url || invitation.cover_image)}
        />
      ) : (
        (invitation.cover_image || invitation.background_video_url) && (
          <div
            className="background-image-element"
            style={{ backgroundImage: `url("${getMediaUrl(invitation.cover_image || invitation.background_video_url)}")` }}
          />
        )
      )}

      {/* Moving Cyber Tech Overlay */}
      <div className="tech-grid"></div>
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>
      <canvas id="cyberCanvas" ref={canvasRef}></canvas>

      {/* ==================== 2-DOOR SPLIT OPENING OVERLAY ==================== */}
      <div className={`two-door-overlay ${isOpenPane ? "opened" : ""}`}>
        <div className="door-panel left-door"></div>
        <div className="door-panel right-door"></div>

        <div className="door-center-content">
          <div className="logo-container-door">
            <img src="https://www.pom.go.id/assets/img/logo.png" alt="Logo BPOM" className="bpom-logo-img" />
            <div className="agency-title">
              <h2>BADAN PENGAWAS OBAT DAN MAKANAN</h2>
              <p>REPUBLIK INDONESIA</p>
            </div>
          </div>

          <div className="badge-ai">
            <TypingText text={invitation.event_category || "TRANSFORMASI BPOM"} speed={25} />
          </div>
          <TypingText tag="h1" className="main-title-door" text={invitation.title} speed={30} delay={200} />
          <TypingText tag="p" className="subtitle-door" text={invitation.organizer || "Balai Besar POM di Palopo"} speed={20} delay={400} />

          <div className="recipient-box-door">
            <span className="to-label">Yth. Bapak / Ibu / Rekan</span>
            <TypingText tag="h3" className="recipient-name" text={guest ? guest.guest_name : tokenParam ? decodeURIComponent(tokenParam) : "Tamu Undangan"} speed={30} delay={500} />
            <span className="to-desc">di Tempat</span>
          </div>

          <button className="btn-open-door" onClick={handleOpenInvitation}>
            <UnlockOutlined /> Buka Undangan Digital
          </button>
        </div>
      </div>

      {/* ==================== MAIN INNER CONTENT PANE (LOCKED UNTIL OPENED) ==================== */}
      <main className="content-pane-main">
        {/* SECTION 1: SAMBUTAN (PENGANTAR) */}
        <section className="content-section">
          <div className="glass-card">
            <div className="section-badge">
              <TypingText text={invitation.badge_text || "PENGANTAR"} speed={25} />
            </div>
            <TypingText tag="h2" className="section-title" text={invitation.intro_title || "Menuju Birokrasi Cerdas"} speed={25} delay={150} />
            <TypingText
              tag="p"
              className="section-text"
              text={invitation.description || "Komunikasi, Informasi, & Edukasi Obat dan Makanan kepada masyarakat."}
              speed={15}
              delay={300}
            />

            {(invitation.quote_text || invitation.quote_author) && (
              <div className="quote-container">
                <TypingText
                  tag="p"
                  className="quote-text"
                  text={`"${invitation.quote_text || 'Penerapan teknologi modern dalam manajemen SDM bukan sekadar mengadopsi teknologi, melainkan mentransformasi budaya kerja menuju efisiensi tanpa batas.'}"`}
                  speed={15}
                  delay={450}
                />
                <span className="quote-author">
                  <TypingText text={invitation.quote_author || "Balai Besar POM di Palopo"} speed={20} delay={650} />
                </span>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: WAKTU & TEMPAT (PELAKSANAAN ACARA) */}
        <section className="content-section">
          <div className="glass-card">
            <div className="section-badge">
              <TypingText text="WAKTU & TEMPAT" speed={25} />
            </div>
            <TypingText tag="h2" className="section-title" text="Pelaksanaan Acara" speed={25} delay={150} />

            <div className="details-grid">
              <div className="detail-item">
                <div className="detail-icon">
                  <CalendarOutlined />
                </div>
                <div className="detail-info">
                  <h3>Hari & Tanggal</h3>
                  <p className="highlight">
                    {dayjs(invitation.event_date).format("dddd, DD MMMM YYYY")}
                  </p>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">
                  <ClockCircleOutlined />
                </div>
                <div className="detail-info">
                  <h3>Waktu Acara</h3>
                  <p className="highlight">
                    {invitation.event_time_start} {invitation.timezone || "WITA"} - Selesai
                  </p>
                </div>
              </div>

              <div className="detail-item full-width">
                <div className="detail-icon">
                  <EnvironmentOutlined />
                </div>
                <div className="detail-info">
                  <h3>Tempat Acara</h3>
                  <p className="highlight">{invitation.location_name || "Aula Utama BPOM"}</p>
                  <p>{invitation.location_address || "Kantor Pusat Badan POM RI"}</p>
                </div>
              </div>
            </div>

            {/* COUNTDOWN TIMER */}
            {invitation.custom_config?.enable_countdown !== false && (
              <div className="countdown-wrapper">
                <h3>Hitung Mundur Acara</h3>
                <div className="countdown-container">
                  <div className="countdown-box">
                    <span className="time">{timeLeft.days}</span>
                    <span className="label">Hari</span>
                  </div>
                  <div className="countdown-box">
                    <span className="time">{timeLeft.hours}</span>
                    <span className="label">Jam</span>
                  </div>
                  <div className="countdown-box">
                    <span className="time">{timeLeft.minutes}</span>
                    <span className="label">Menit</span>
                  </div>
                  <div className="countdown-box">
                    <span className="time">{timeLeft.seconds}</span>
                    <span className="label">Detik</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: AGENDA / RUNDOWN */}
        <section className="content-section">
          <div className="glass-card">
            <div className="section-badge">
              <TypingText text="AGENDA" speed={25} />
            </div>
            <TypingText tag="h2" className="section-title" text="Rundown Kegiatan" speed={25} delay={150} />

            {invitation.agenda_timeline && Array.isArray(invitation.agenda_timeline) && invitation.agenda_timeline.length > 0 ? (
              <div className="timeline">
                {invitation.agenda_timeline.map((item, idx) => (
                  <div className="timeline-item" key={idx}>
                    <span className="time-label">{item.time || `Sesi ${idx + 1}`}</span>
                    <div className="timeline-content">
                      <h4>{item.title}</h4>
                      {item.speaker && <p>🎙️ Narasumber / PJ: {item.speaker}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Paragraph style={{ color: "#94a3b8" }}>Susunan agenda acara akan diinformasikan saat registrasi.</Paragraph>
            )}

            {invitation.online_meeting_link && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<VideoCameraOutlined />}
                  onClick={() => window.open(invitation.online_meeting_link, "_blank")}
                  style={{ background: "linear-gradient(135deg, #0F5B99 0%, #00f0ff 100%)", borderRadius: 10, fontWeight: 700 }}
                >
                  Gabung Virtual Meeting Zoom/GMeet
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: TIKET PRESENSI QR CODE */}
        {guest && (
          <section className="content-section">
            <div className="glass-card" style={{ border: "1px solid #00f0ff", textAlign: "center" }}>
              <div className="section-badge">
                <TypingText text="TIKET PRESENSI RESMI" speed={25} />
              </div>
              <TypingText tag="h2" className="section-title" text="Tiket Presensi QR Code Anda" speed={25} delay={150} />
              <TypingText
                tag="p"
                className="section-text"
                text="Tunjukkan kode QR ini kepada panitia saat kedatangan untuk pencatatan presensi instan."
                speed={15}
                delay={300}
              />

              <div style={{ background: "#ffffff", padding: 14, borderRadius: 16, display: "inline-block", margin: "16px 0" }}>
                <QRCodeSVG value={guest.qr_code_secret || guest.token} size={140} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#00f0ff" }}>
                KODE: {guest.qr_code_secret}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 5: LOKASI & PETA */}
        <section className="content-section">
          <div className="glass-card">
            <div className="section-badge">
              <TypingText text="LOKASI" speed={25} />
            </div>
            <TypingText tag="h2" className="section-title" text="Peta Lokasi Acara" speed={25} delay={150} />
            <p className="section-text">
              <strong>{invitation.location_name || "Kantor BPOM"}</strong><br />
              {invitation.location_address || "Jl. Percetakan Negara No. 23, Jakarta Pusat"}
            </p>

            <div className="map-container">
              <Text style={{ color: "#00f0ff", fontWeight: 700 }}>{invitation.location_name || "Lokasi BPOM"}</Text>
            </div>

            <div className="map-actions">
              <button className="btn-secondary" onClick={copyAddress}>
                <CopyOutlined /> Salin Alamat
              </button>
              {invitation.location_map_url && (
                <a href={invitation.location_map_url} target="_blank" rel="noopener noreferrer" className="btn-primary-link">
                  <CompassOutlined /> Petunjuk Arah (Maps)
                </a>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 6: FORM RSVP */}
        {invitation.custom_config?.enable_rsvp !== false && (
          <section className="content-section" id="section-rsvp">
            <div className="glass-card">
              <div className="section-badge">
                <TypingText text="KONFIRMASI" speed={25} />
              </div>
              <TypingText tag="h2" className="section-title" text="Konfirmasi Kehadiran (RSVP)" speed={25} delay={150} />

              <Form form={rsvpForm} layout="vertical" onFinish={handleFormFinish}>
                <Form.Item name="guest_name" label={<span style={{ color: "#cbd5e1" }}>Nama Lengkap & Gelar</span>} rules={[{ required: true }]}>
                  <Input placeholder="Nama beserta gelar" style={{ background: "rgba(255,255,255,0.05)", color: "#fff", borderColor: "rgba(255,255,255,0.1)" }} />
                </Form.Item>

                <Form.Item name="guest_institution" label={<span style={{ color: "#cbd5e1" }}>Nama Instansi / Unit Kerja</span>}>
                  <Input placeholder="Contoh: Biro SDM / Balai POM" style={{ background: "rgba(255,255,255,0.05)", color: "#fff", borderColor: "rgba(255,255,255,0.1)" }} />
                </Form.Item>

                <Form.Item name="rsvp_status" label={<span style={{ color: "#cbd5e1" }}>Konfirmasi Kehadiran</span>} rules={[{ required: true }]}>
                  <Radio.Group style={{ width: "100%" }}>
                    <Radio.Button value="attending" style={{ width: "33%", textAlign: "center" }}>Hadir</Radio.Button>
                    <Radio.Button value="tentative" style={{ width: "33%", textAlign: "center" }}>Ragu</Radio.Button>
                    <Radio.Button value="declined" style={{ width: "33%", textAlign: "center" }}>Absen</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item name="wishes_or_notes" label={<span style={{ color: "#cbd5e1" }}>Pesan / Harapan untuk Acara</span>}>
                  <TextArea rows={3} placeholder="Tuliskan harapan Anda..." style={{ background: "rgba(255,255,255,0.05)", color: "#fff", borderColor: "rgba(255,255,255,0.1)" }} />
                </Form.Item>

                <Button type="primary" block size="large" loading={submittingRsvp} htmlType="submit" style={{ background: "linear-gradient(135deg, #0F5B99 0%, #00f0ff 100%)", borderRadius: 10, fontWeight: 700 }}>
                  Kirim Konfirmasi RSVP
                </Button>
              </Form>
            </div>
          </section>
        )}

        {/* SECTION 7: BUKU TAMU & UCAPAN */}
        {invitation.custom_config?.enable_guestbook !== false && wishes.length > 0 && (
          <section className="content-section">
            <div className="glass-card">
              <div className="section-badge">BUKU TAMU</div>
              <h2 className="section-title">Ucapan & Harapan</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {wishes.map((w, idx) => (
                  <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text strong style={{ color: "#00f0ff", fontSize: "13px" }}>{w.guest_name}</Text>
                      <Tag color={w.rsvp_status === "attending" ? "cyan" : "default"}>{w.rsvp_status === "attending" ? "Hadir" : "Absen"}</Tag>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{w.guest_institution}</div>
                    <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: 4 }}>"{w.wishes_or_notes}"</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer style={{ textAlign: "center", padding: "24px 0", fontSize: "11px", color: "#94a3b8" }}>
          <p>&copy; 2026 {invitation.organizer || "Biro SDM Badan Pengawas Obat dan Makanan RI"}</p>
        </footer>
      </main>
    </div>
  );
}
