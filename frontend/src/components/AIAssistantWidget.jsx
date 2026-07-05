import React, { useState, useEffect, useRef } from "react";
import { 
  MessageOutlined, 
  CloseOutlined, 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined,
  LoadingOutlined,
  MinusOutlined
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import "./AIAssistantWidget.css";

const AIAssistantWidget = () => {
  const { apiFetch, user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { 
      role: "assistant", 
      content: `Selamat datang, Bapak/Ibu ${user?.name?.split(' ')[0] || 'Rekan'}. Saya adalah SIPTU Concierge, asisten digital resmi Anda. Ada informasi atau bantuan operasional yang dapat kami berikan untuk Anda hari ini?` 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "Maaf, terjadi kendala koneksi ke otak AI. Silakan coba lagi nanti." }]);
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Maaf, terjadi kesalahan teknis." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`ai-widget-container ${isOpen ? "is-open" : ""} ${isMinimized ? "is-minimized" : ""}`}>
      {/* Selaras Bubble */}
      {!isOpen && user && (
        <button 
          className="selaras-floating-btn" 
          onClick={() => {
            const ssoUrl = `https://selaras.bpompalopo.com/auth/sso?token=${token}&user=${user.nip}`;
            window.open(ssoUrl, '_blank');
          }}
        >
          <div className="selaras-stars">
            <div className="star s1">★</div>
            <div className="star s2">✦</div>
            <div className="star s3">✨</div>
          </div>
          <img src="/logo/selaras.png" alt="Selaras" className="selaras-icon-img" />
          <span className="selaras-btn-label">SELARAS</span>
        </button>
      )}

      {/* Floating Button (AI Concierge) */}
      {!isOpen && (
        <button className="ai-floating-btn" onClick={() => setIsOpen(true)}>
          <div className="ai-btn-glow" />
          <MessageOutlined />
          <span className="ai-btn-label">SIPTU Concierge</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-header-info">
              <div className="ai-avatar-glow">
                <RobotOutlined />
              </div>
              <div>
                <h4>SIPTU Concierge</h4>
                <span className="ai-status-online">● Online</span>
              </div>
            </div>
            <div className="ai-header-actions">
              <button onClick={() => setIsMinimized(!isMinimized)} className="ai-action-btn">
                <MinusOutlined />
              </button>
              <button onClick={() => setIsOpen(false)} className="ai-action-btn ai-close-btn">
                <CloseOutlined />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="ai-chat-messages">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`ai-message-row ${msg.role}`}>
                    <div className="ai-message-bubble">
                      {msg.role === 'assistant' && <div className="ai-msg-icon"><RobotOutlined /></div>}
                      <div className="ai-msg-content">{msg.content}</div>
                      {msg.role === 'user' && <div className="ai-msg-icon user"><UserOutlined /></div>}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="ai-message-row assistant">
                    <div className="ai-message-bubble loading">
                      <LoadingOutlined /> <span>SIPTU sedang berpikir...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="ai-chat-input-area" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Tanya sesuatu..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                />
                <button type="submit" disabled={!message.trim() || isLoading}>
                  <SendOutlined />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
