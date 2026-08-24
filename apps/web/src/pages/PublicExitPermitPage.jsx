import { useEffect, useState, useRef, useMemo } from "react";
import { App as AntdApp, Modal, Select, Checkbox, Spin } from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useGeofence } from "../hooks/useGeofence.js";
import PublicFormLayout from "../layouts/PublicFormLayout.jsx";
import "./PublicExitPermitPage.css";

const RISPEG_COLORS = {
  primary: "var(--color-primary)",
  gradient: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
  shadowColor: "var(--color-primary-ring)",
};

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const svc = {
  authGet: async (url, token) => {
    const r = await fetch(`${API}${url}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.message || "Gagal memuat data.");
    }
    return r.json();
  },
  publicPost: async (url, body, maxRetries = 2) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        const r = await fetch(`${API}${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status >= 500 && attempt < maxRetries) {
            await new Promise((res) => setTimeout(res, 350));
            continue;
          }
          throw new Error(d.message || "Gagal memproses permintaan.");
        }
        return d;
      } catch (err) {
        if (attempt < maxRetries && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('database') || err.message?.includes('Koneksi'))) {
          await new Promise((res) => setTimeout(res, 350));
          continue;
        }
        throw err;
      }
    }
  },
  publicPut: async (url, body, maxRetries = 2) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        const r = await fetch(`${API}${url}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status >= 500 && attempt < maxRetries) {
            await new Promise((res) => setTimeout(res, 350));
            continue;
          }
          throw new Error(d.message || "Gagal memproses permintaan.");
        }
        return d;
      } catch (err) {
        if (attempt < maxRetries && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('database') || err.message?.includes('Koneksi'))) {
          await new Promise((res) => setTimeout(res, 350));
          continue;
        }
        throw err;
      }
    }
  },
};

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h > 0 ? h + " jam " : ""}${m} menit ${s} detik`;
}

function formatTime(timeStr) {
  if (!timeStr) return "-";
  const parts = timeStr.split(":");
  return `${parts[0]}:${parts[1]}`;
}

function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS/geolocation."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        reject(new Error("Lokasi GPS tidak dapat diakses. Pastikan izin lokasi aktif."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

const PublicExitPermitPage = () => {
  const { user, token } = useAuth();
  const { message } = AntdApp.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const ticketIdParam = searchParams.get("ticket");
  const isHistoryMode = searchParams.get("source") === "history";

  const [phase, setPhase] = useState("loading"); // loading | lookup | confirm | out | done
  const [loading, setLoading] = useState(false);
  const [lookupNip, setLookupNip] = useState("");
  const [employee, setEmployee] = useState(null);
  const [activePermit, setActivePermit] = useState(null);
  const [reason, setReason] = useState("");
  const [permitType, setPermitType] = useState("Pribadi");
  const [result, setResult] = useState(null);

  // Group Exit variables
  const [taggedNips, setTaggedNips] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [returningIds, setReturningIds] = useState([]);
  const debounceRef = useRef(null);

  // Search Suggestions variables
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const suggestionRef = useRef(null);
  const suggestDebounceRef = useRef(null);

  const searchEmployees = async (value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value) {
      setEmployeeOptions([]);
      return;
    }
    setFetchingEmployees(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/public/employees/search?q=${value}`);
        if (r.ok) {
          const data = await r.json();
          setEmployeeOptions(data.map(e => ({
            label: `${e.name} (${e.nip})`,
            value: e.nip,
          })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingEmployees(false);
      }
    }, 500);
  };

  const searchSuggestions = async (val) => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setFetchingSuggestions(true);
    setShowSuggestions(true);
    suggestDebounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/public/employees/search?q=${val}`);
        if (r.ok) {
          const data = await r.json();
          setSuggestions(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingSuggestions(false);
      }
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (phase === "out" && activePermit?.group_id) {
      // fetch group members
      const fetchGroup = async () => {
        try {
          const r = await fetch(`${API}/public/exit-permits/group/${activePermit.group_id}`);
          if (r.ok) {
            const data = await r.json();
            // exclude current employee from the selectable list
            const others = data.filter(m => m.id !== activePermit.id);
            setGroupMembers(others);
            setReturningIds(others.map(m => m.id)); // default all selected
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchGroup();
    }
  }, [phase, activePermit?.group_id, activePermit?.id]);

  const handleAutoReturn = (data) => {
    setResult(data.permit);
    setPhase("done");
    message.success("Izin keluar otomatis diselesaikan oleh sistem!");
  };

  const geofencePingFn = async (body) => {
    return svc.publicPost("/public/exit-permits/geofence-ping", body);
  };

  const { locationStatus, distance, timeRemaining, isInside } = useGeofence(
    phase === "out" && activePermit ? { nip: employee?.nip || lookupNip } : false,
    handleAutoReturn,
    geofencePingFn
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (ticketIdParam && token) {
        setPhase("loading");
        try {
          const detail = await svc.authGet(`/exit-permits/${ticketIdParam}`, token);
          if (cancelled) return;

          setEmployee({
            id: detail.employee_id,
            nip: detail.nip,
            name: detail.employee_name,
            function_area: detail?.employee?.function_area,
          });

          if (detail.status === "out") {
            setActivePermit(detail);
            setPhase("out");
          } else {
            setResult(detail);
            setPhase("done");
          }
          return;
        } catch (e) {
          if (!cancelled) {
            message.error(e.message);
            setPhase("lookup");
          }
          return;
        }
      }

      if (!ticketIdParam && user?.nip) {
        setLookupNip((prev) => prev || user.nip);
      }

      if (!cancelled) setPhase("lookup");
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [ticketIdParam, token, user?.nip, message]);

  const handleLookupWithNip = async (targetNip) => {
    const nip = targetNip.trim();
    if (!nip) {
      message.error("NIP atau Nama wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const data = await svc.publicPost("/public/exit-permits/lookup", { nip });
      setEmployee(data.employee);
      setActivePermit(data.active_permit || null);
      setResult(null);
      setReason("");
      setTaggedNips([]);
      setPhase(data.active_permit ? "out" : "confirm");
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupByNip = () => handleLookupWithNip(lookupNip);

  const handleExit = () => {
    Modal.confirm({
      title: "Konfirmasi Izin Keluar",
      className: "pep-modal-confirm",
      icon: <QuestionCircleOutlined style={{ color: RISPEG_COLORS.primary }} />,
      content: "Apakah Anda yakin ingin mencatat izin keluar sekarang?",
      okText: "Ya, Izin Keluar",
      cancelText: "Batal",
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(true);
        try {
          const pos = await requestCurrentPosition();
          const data = await svc.publicPost("/public/exit-permits/exit", {
            nip: employee?.nip || lookupNip.trim(),
            reason: reason.trim() || null,
            permit_type: permitType,
            latitude: pos.latitude,
            longitude: pos.longitude,
            tagged_nips: taggedNips,
          });
          setActivePermit(data.permit);
          setPhase("out");
          message.success("Izin keluar berhasil dicatat!");
        } catch (e) {
          message.error(e.message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleReturn = () => {
    if (!activePermit?.id) return;

    Modal.confirm({
      title: "Konfirmasi Kembali",
      className: "pep-modal-confirm",
      icon: <QuestionCircleOutlined style={{ color: RISPEG_COLORS.primary }} />,
      content: "Apakah Anda yakin ingin mencatat waktu kembali sekarang?",
      okText: "Ya, Kembali",
      cancelText: "Batal",
      okButtonProps: { type: "primary" },
      onOk: async () => {
        setLoading(true);
        try {
          const pos = await requestCurrentPosition();
          const data = await svc.publicPut(`/public/exit-permits/${activePermit.id}/return`, {
            nip: employee?.nip || lookupNip.trim(),
            latitude: pos.latitude,
            longitude: pos.longitude,
            returning_ids: returningIds,
          });
          setResult(data.permit);
          setPhase("done");
          message.success("Waktu kembali berhasil dicatat!");
        } catch (e) {
          message.error(e.message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleReset = () => {
    if (isHistoryMode) {
      navigate("/app/riwayat-layanan");
      return;
    }

    setPhase("lookup");
    setEmployee(null);
    setActivePermit(null);
    setReason("");
    setPermitType("Pribadi");
    setTaggedNips([]);
    setResult(null);
  };

  return (
    <PublicFormLayout>
      <div className="pep-page">
        <div className="pep-background">
          <div className="pep-orb pep-orb-1" />
          <div className="pep-orb pep-orb-2" />
        </div>
        <div className="pep-container">

          <div className="pep-header">
            <div
              className="pep-header__icon"
              style={{
                background: RISPEG_COLORS.gradient,
                boxShadow: `0 8px 20px ${RISPEG_COLORS.shadowColor}`,
              }}
            >
              <ClockCircleOutlined style={{ color: "#fff" }} />
            </div>
            <h1 className="pep-header__title">Izin Keluar</h1>
            <p className="pep-header__sub">Sistem Pencatatan Izin Keluar Pegawai</p>
          </div>

          {phase === "loading" && (
            <div className="pep-glass-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div
                className="pep-spinner"
                style={{
                  width: 32,
                  height: 32,
                  margin: "0 auto 16px",
                  borderWidth: 3,
                  borderColor: "rgba(139, 92, 246, 0.2)",
                  borderTopColor: RISPEG_COLORS.primary,
                }}
              />
              <p style={{ color: "#6b7280", margin: 0 }}>Memuat data...</p>
            </div>
          )}

          {phase === "lookup" && (
            <div className="pep-glass-card">
              <div className="pep-card-header-nav">
                <a href="/app/layanan-mandiri" className="pep-card-back-btn">
                  <ArrowLeftOutlined /> Kembali
                </a>
              </div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h2
                  style={{
                    margin: 0,
                    color: "#1f2937",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  Masukkan NIP / Nama
                </h2>
                <p style={{ color: "#6b7280", margin: "8px 0 0" }}>
                  Tidak perlu login. Isi NIP atau Nama pegawai untuk melanjutkan izin keluar.
                </p>
              </div>

              <div className="pep-lookup-form" ref={suggestionRef}>
                <div className="pep-input-wrapper">
                  <input
                    type="text"
                    className="pep-input"
                    placeholder="Ketik NIP atau nama pegawai..."
                    value={lookupNip}
                    onChange={(e) => {
                      setLookupNip(e.target.value);
                      searchSuggestions(e.target.value);
                    }}
                    onFocus={() => {
                      if (lookupNip.trim()) setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setShowSuggestions(false);
                        handleLookupByNip();
                      }
                    }}
                  />
                  {showSuggestions && (
                    <div className="pep-suggestions-dropdown">
                      {fetchingSuggestions && (
                        <div className="pep-suggestion-loading">
                          <Spin size="small" /> Memuat saran...
                        </div>
                      )}
                      {!fetchingSuggestions && suggestions.length === 0 && (
                        <div className="pep-suggestion-empty">
                          Tidak ada data pegawai yang cocok
                        </div>
                      )}
                      {!fetchingSuggestions && suggestions.length > 0 && (
                        <ul className="pep-suggestions-list">
                          {suggestions.map((emp) => (
                            <li
                              key={emp.id}
                              className="pep-suggestion-item"
                              onClick={() => {
                                setLookupNip(emp.nip);
                                setShowSuggestions(false);
                                handleLookupWithNip(emp.nip);
                              }}
                            >
                              <div className="pep-suggestion-item__name">{emp.name}</div>
                              <div className="pep-suggestion-item__nip">
                                NIP: {emp.nip} {emp.function_area ? `• ${emp.function_area}` : ""}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="pep-btn pep-btn--primary pep-btn--full"
                  onClick={() => {
                    setShowSuggestions(false);
                    handleLookupByNip();
                  }}
                  disabled={loading}
                >
                  {loading ? <span className="pep-spinner" /> : <ArrowRightOutlined />}
                  Cari Data Pegawai
                </button>
              </div>
            </div>
          )}

          {phase === "confirm" && employee && (
            <div className="pep-glass-card pep-card--confirm">
              <div className="pep-card-header-nav">
                <a onClick={handleReset} className="pep-card-back-btn">
                  <ArrowLeftOutlined /> Kembali
                </a>
              </div>
              <div className="pep-profile">
                <div
                  className="pep-profile__avatar"
                  style={{
                    background: RISPEG_COLORS.gradient,
                    boxShadow: `0 4px 12px ${RISPEG_COLORS.shadowColor}`,
                  }}
                >
                  <UserOutlined style={{ color: "#fff" }} />
                </div>
                <div className="pep-profile__info">
                  <h3 className="pep-profile__name">{employee.name}</h3>
                  <p className="pep-profile__nip">NIP: {employee.nip}</p>
                  {employee.function_area && (
                    <span className="pep-profile__badge">{employee.function_area}</span>
                  )}
                </div>
              </div>

              <div className="pep-divider" />

              <div className="pep-field">
                <label className="pep-field__label">
                  Jenis Urusan <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="pep-radio-group">
                  <label className={`pep-radio-option${permitType === 'Pribadi' ? ' pep-radio-option--active' : ''}`}>
                    <input
                      type="radio"
                      name="permitType"
                      value="Pribadi"
                      checked={permitType === 'Pribadi'}
                      onChange={() => setPermitType('Pribadi')}
                    />
                    <span className="pep-radio-option__dot" />
                    <span className="pep-radio-option__text">Urusan Pribadi</span>
                  </label>
                  <label className={`pep-radio-option${permitType === 'Kantor' ? ' pep-radio-option--active' : ''}`}>
                    <input
                      type="radio"
                      name="permitType"
                      value="Kantor"
                      checked={permitType === 'Kantor'}
                      onChange={() => setPermitType('Kantor')}
                    />
                    <span className="pep-radio-option__dot" />
                    <span className="pep-radio-option__text">Urusan Kantor</span>
                  </label>
                </div>
              </div>

              <div className="pep-field">
                <label className="pep-field__label">
                  Keperluan / Alasan Keluar <span className="pep-field__opt">(opsional)</span>
                </label>
                <textarea
                  className="pep-textarea"
                  rows={3}
                  placeholder="Contoh: Keperluan ke bank, urusan dinas, dll..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="pep-field">
                <label className="pep-field__label">
                  Rekan Pegawai <span className="pep-field__opt">(opsional - jika keluar berkelompok)</span>
                </label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Ketik nama / NIP untuk mencari..."
                  value={taggedNips}
                  onChange={setTaggedNips}
                  onSearch={searchEmployees}
                  filterOption={false}
                  options={employeeOptions}
                  notFoundContent={fetchingEmployees ? <Spin size="small" /> : null}
                  size="large"
                />
              </div>

              <div className="pep-actions pep-actions--center">
                <button
                  className="pep-btn pep-btn--danger pep-btn--large pep-btn--full"
                  onClick={handleExit}
                  disabled={loading}
                >
                  {loading ? <span className="pep-spinner" /> : <LogoutOutlined />}
                  Izin Keluar
                </button>
              </div>
            </div>
          )}

          {phase === "out" && employee && activePermit && (
            <div className="pep-glass-card pep-card--out">
              <div className="pep-card-header-nav">
                <a href="/app/layanan-mandiri" className="pep-card-back-btn">
                  <ArrowLeftOutlined /> Dashboard
                </a>
              </div>
              <div className="pep-profile pep-profile--compact">
                <div
                  className="pep-profile__avatar pep-profile__avatar--out"
                  style={{
                    background: RISPEG_COLORS.gradient,
                    boxShadow: `0 4px 12px ${RISPEG_COLORS.shadowColor}`,
                  }}
                >
                  <LogoutOutlined style={{ color: "#fff" }} />
                </div>
                <div className="pep-profile__info">
                  <h3 className="pep-profile__name">{employee.name}</h3>
                  <span className="pep-status-badge pep-status-badge--out">Sedang di Luar</span>
                </div>
              </div>

              <div className="pep-out-info">
                <div className="pep-out-info__icon">
                  <FieldTimeOutlined />
                </div>
                <div className="pep-out-info__content">
                  <div className="pep-out-info__label">Tercatat Keluar Pada</div>
                  <div className="pep-out-info__time">{formatTime(activePermit.exit_time)} WIB</div>
                </div>
              </div>

              {activePermit.reason && (
                <div className="pep-reason-box">
                  <span className="pep-reason-box__label">Keperluan:</span> {activePermit.reason}
                </div>
              )}

              {activePermit.permit_type && (
                <div className="pep-reason-box" style={{ marginTop: 8 }}>
                  <span className="pep-reason-box__label">Jenis Urusan:</span>{" "}
                  <span style={{
                    fontWeight: 700,
                    color: activePermit.permit_type === 'Kantor' ? '#2563eb' : '#f59e0b',
                  }}>
                    {activePermit.permit_type === 'Kantor' ? 'Urusan Kantor' : 'Urusan Pribadi'}
                  </span>
                </div>
              )}

              <div className="pep-reason-box" style={{ marginTop: 16, background: "rgba(255,255,255,0.8)", borderColor: "#e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                  Status Geofence
                </div>
                <div style={{ fontSize: 13, color: isInside ? "#10b981" : "#ef4444", fontWeight: 500 }}>
                  {locationStatus}
                </div>
                {distance !== null && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    Jarak ke kantor: {distance} meter
                  </div>
                )}
                {timeRemaining !== null && (
                  <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4, fontWeight: 600 }}>
                    Menunggu: {timeRemaining} detik
                  </div>
                )}
              </div>

              {groupMembers.length > 0 && (
                <div className="pep-reason-box" style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                    Rekan Rombongan yang Belum Kembali:
                  </div>
                  <Checkbox.Group
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
                    value={returningIds}
                    onChange={setReturningIds}
                  >
                    {groupMembers.map(member => (
                      <Checkbox key={member.id} value={member.id}>
                        {member.employee_name}
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                    * Centang nama rekan jika mereka juga kembali bersama Anda.
                  </div>
                </div>
              )}

              <div className="pep-actions pep-actions--center" style={{ marginTop: "24px" }}>
                <button
                  className="pep-btn pep-btn--success pep-btn--large pep-btn--full"
                  onClick={handleReturn}
                  disabled={loading}
                >
                  {loading ? <span className="pep-spinner" /> : <LoginOutlined />}
                  Tandai Kembali
                </button>
              </div>
            </div>
          )}

          {phase === "done" && result && (
            <div className="pep-glass-card pep-card--done">
              <div className="pep-card-header-nav">
                <a onClick={handleReset} className="pep-card-back-btn">
                  <ArrowLeftOutlined /> {isHistoryMode ? "Kembali" : "Mulai Baru"}
                </a>
              </div>
              <div
                className="pep-done-icon"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
                }}
              >
                <CheckOutlined style={{ color: "#fff", fontSize: 32 }} />
              </div>
              <h2 className="pep-done-title">{isHistoryMode ? "Detail Izin Keluar" : "Tercatat!"}</h2>
              <p className="pep-done-sub">
                {isHistoryMode
                  ? "Berikut adalah detail rekam izin keluar yang dipilih."
                  : "Izin keluar Anda telah dicatat dengan lengkap."}
              </p>

              <div className="pep-receipt">
                <div className="pep-receipt__section">
                  <div className="pep-receipt__row">
                    <span className="pep-receipt__label">Nama</span>
                    <span className="pep-receipt__value">{result.employee_name}</span>
                  </div>
                  <div className="pep-receipt__row">
                    <span className="pep-receipt__label">NIP</span>
                    <span className="pep-receipt__value">{result.nip}</span>
                  </div>
                  <div className="pep-receipt__row">
                    <span className="pep-receipt__label">Tanggal</span>
                    <span className="pep-receipt__value">
                      {new Date(result.date).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="pep-receipt__tear-line">
                  <div className="pep-receipt__hole pep-receipt__hole--left" />
                  <div className="pep-receipt__hole pep-receipt__hole--right" />
                  <div className="pep-receipt__dash" />
                </div>

                <div className="pep-receipt__section">
                  <div className="pep-receipt__row">
                    <span className="pep-receipt__label">Jam Keluar</span>
                    <span className="pep-receipt__value pep-receipt__value--time">
                      {formatTime(result.exit_time)} WIB
                    </span>
                  </div>
                  <div className="pep-receipt__row">
                    <span className="pep-receipt__label">Jam Kembali</span>
                    <span className="pep-receipt__value pep-receipt__value--time">
                      {formatTime(result.return_time)} WIB
                    </span>
                  </div>

                  <div className="pep-receipt__row pep-receipt__row--highlight">
                    <span className="pep-receipt__label">Total Durasi</span>
                    <span className="pep-receipt__value pep-receipt__value--duration">
                      {result.duration_seconds_effective != null
                        ? formatDuration(result.duration_seconds_effective)
                        : result.duration_minutes != null
                          ? formatDuration(result.duration_minutes * 60)
                          : "-"}
                    </span>
                  </div>

                  {result.reason && (
                    <div className="pep-receipt__row">
                      <span className="pep-receipt__label">Keperluan</span>
                      <span className="pep-receipt__value">{result.reason}</span>
                    </div>
                  )}

                  {result.permit_type && (
                    <div className="pep-receipt__row">
                      <span className="pep-receipt__label">Jenis Urusan</span>
                      <span className={`pep-receipt__badge pep-receipt__badge--${result.permit_type.toLowerCase()}`}>
                        {result.permit_type === 'Kantor' ? 'Urusan Kantor' : 'Urusan Pribadi'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pep-receipt__footer-note">
                  <div className="pep-receipt__footer-status">✓ VALIDASI DIGITAL SIPTU</div>
                  <div className="pep-receipt__footer-timestamp">Pencatatan Otomatis - BPOM Palopo</div>
                </div>
              </div>

              <button
                className="pep-btn pep-btn--full"
                onClick={handleReset}
                style={{
                  background: RISPEG_COLORS.gradient,
                  borderColor: RISPEG_COLORS.primary,
                  color: "#fff",
                }}
              >
                {isHistoryMode ? "Kembali ke Riwayat" : "Selesai"}
              </button>
            </div>
          )}

          <div className="pep-footer">SIPTU - Sistem Informasi Pelayanan Tata Usaha</div>
        </div>
      </div>
    </PublicFormLayout>
  );
};

export default PublicExitPermitPage;
