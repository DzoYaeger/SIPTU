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
  const { apiFetch, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { 
      role: "assistant", 
      content: `Selamat datang, ${user?.name?.split(' ')[0] || 'Bapak/Ibu'}. Saya adalah SIPTU Concierge, asisten digital resmi Anda. Ada informasi atau bantuan operasional yang dapat kami berikan untuk Anda hari ini?` 
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
    if (e && e.preventDefault) e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    
    // Prepare updated history to pass to backend
    const updatedHistory = [...chatHistory, { role: "user", content: userMessage }];
    setChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      // Send last 8 chat turns as history so assistant remembers conversation context
      const historyPayload = updatedHistory.slice(1).slice(-8);

      const response = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage, history: historyPayload }),
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
      {/* Single Minimalist Floating AI Concierge Button */}
      {!isOpen && (
        <button
          className="ai-floating-btn"
          onClick={() => setIsOpen(true)}
          title="Tanya SIPTU AI Concierge"
        >
          <MessageOutlined className="ai-btn-icon" />
          <span className="ai-btn-label">Tanya AI Concierge</span>
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
                <span className="ai-status-online">● Siap Membantu</span>
              </div>
            </div>
            <div className="ai-header-actions">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="ai-action-btn"
                title={isMinimized ? "Perbesar" : "Kecilkan"}
              >
                <MinusOutlined />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="ai-action-btn ai-close-btn"
                title="Tutup Chat"
              >
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
                      <LoadingOutlined /> <span>SIPTU Concierge sedang mengetik...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="ai-chat-input-area" onSubmit={handleSendMessage}>
                <textarea
                  className="ai-chat-textarea"
                  placeholder="Tanya info layanan / SOP / regulasi..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  rows={1}
                  disabled={isLoading}
                />
                <button type="submit" disabled={!message.trim() || isLoading} title="Kirim Pesan">
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
