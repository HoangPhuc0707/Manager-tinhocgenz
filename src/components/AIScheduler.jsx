import { useState, useRef, useEffect } from 'react';
import { askAISchedule } from '../services/aiService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Tạo lesson ID mới
const generateLessonId = (existingIds) => {
  const nums = existingIds
    .map(id => parseInt((id || '').replace('LH', ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `LH${String(next).padStart(4, '0')}`;
};

// Định dạng ngày giờ đẹp
const formatDateTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const QUICK_PROMPTS_ADMIN = [
  '📋 Liệt kê tất cả học viên đang học và số buổi còn lại',
  '📅 Gợi ý lịch dạy tuần tới cho tất cả gia sư',
  '⚠️ Học viên nào sắp hết buổi học (còn dưới 5 buổi)?',
  '🔍 Gia sư nào đang dạy nhiều học viên nhất?',
  '✨ Tạo lịch 2 buổi/tuần cho một học viên cụ thể (nhập tên)',
];

const QUICK_PROMPTS_TUTOR = [
  '📋 Liệt kê học sinh của tôi và số buổi còn lại',
  '📅 Gợi ý lịch dạy tuần tới cho học sinh của tôi',
  '⚠️ Học sinh nào của tôi còn ít buổi nhất?',
  '✨ Lên lịch 2 buổi/tuần cho học sinh của tôi',
];

const TypingIndicator = () => (
  <div className="ai-message ai-bubble">
    <div className="ai-avatar">🤖</div>
    <div className="ai-bubble-content typing-indicator">
      <span></span><span></span><span></span>
    </div>
  </div>
);

const AIScheduler = ({ role, activeTutorId, triggerToast }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: role === 'Admin'
        ? '👋 Xin chào! Tôi là trợ lý AI của Tin Học GenZ. Tôi có thể giúp bạn gợi ý và sắp xếp lịch học cho tất cả gia sư và học viên.\n\nBạn có thể hỏi tôi bằng tiếng Việt tự nhiên, ví dụ: *"Xếp 2 buổi/tuần cho em Long tuần tới"* hoặc *"Gia sư nào còn trống thứ Ba tối?"*'
        : '👋 Xin chào! Tôi là trợ lý AI của Tin Học GenZ. Tôi có thể giúp bạn sắp xếp lịch dạy và quản lý học sinh của mình.\n\nBạn có thể hỏi tôi bằng tiếng Việt, ví dụ: *"Gợi ý lịch dạy tuần tới"* hoặc *"Học sinh nào còn nhiều buổi nhất?"*',
      suggestions: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingSuggestions, setEditingSuggestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getConversationHistory = () => {
    return messages
      .filter(m => m.role !== 'assistant' || m !== messages[0]) // Bỏ welcome message
      .map(m => ({ role: m.role, content: m.content }));
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    const userMsg = { role: 'user', content: userText, suggestions: [] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = getConversationHistory();
      const data = await askAISchedule({
        message: userText,
        role,
        tutorId: activeTutorId || '',
        conversationHistory: history
      });

      const assistantMsg = {
        role: 'assistant',
        content: data.reply || '(Không có phản hồi)',
        suggestions: data.suggestions || []
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Nếu có suggestions, mở panel chỉnh sửa
      if (data.suggestions && data.suggestions.length > 0) {
        setEditingSuggestions(data.suggestions.map((s, i) => ({ ...s, _key: i })));
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Lỗi: ${err.message}`,
        suggestions: []
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const updateSuggestion = (key, field, value) => {
    setEditingSuggestions(prev =>
      prev.map(s => s._key === key ? { ...s, [field]: value } : s)
    );
  };

  const removeSuggestion = (key) => {
    setEditingSuggestions(prev => prev.filter(s => s._key !== key));
  };

  const saveAllSuggestions = async () => {
    if (editingSuggestions.length === 0) return;
    setIsSaving(true);

    try {
      // Lấy danh sách lesson IDs hiện có để tạo ID mới
      const existingRes = await fetch(`${API_BASE}/api/lessons`);
      const existingLessons = await existingRes.json();
      const existingIds = (existingLessons || []).map(l => l.id);

      let currentIds = [...existingIds];
      const created = [];

      for (const s of editingSuggestions) {
        const newId = generateLessonId(currentIds);
        currentIds.push(newId);

        const lessonPayload = {
          id: newId,
          tutorId: s.tutorId,
          studentId: s.studentId,
          dateTime: s.dateTime,
          endTime: s.endTime || '',
          status: 'Chưa diễn ra',
          learningFormat: s.learningFormat || 'Offline',
          address: s.address || '',
          note: s.note || ''
        };

        const res = await fetch(`${API_BASE}/api/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonPayload)
        });

        if (!res.ok) throw new Error(`Không thể tạo buổi ${newId}`);
        created.push(newId);
      }

      triggerToast(`✅ Đã lưu ${created.length} buổi học thành công!`, 'success');
      setEditingSuggestions([]);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Đã lưu thành công **${created.length} buổi học** vào hệ thống! Bạn có thể xem trên tab Lịch biểu.`,
        suggestions: []
      }]);
    } catch (err) {
      triggerToast(`❌ Lỗi lưu lịch: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMessageContent = (content) => {
    // Render markdown đơn giản: **bold**, *italic*, xuống dòng
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return <em key={j}>{part.slice(1, -1)}</em>;
            }
            return part;
          })}
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  const quickPrompts = role === 'Admin' ? QUICK_PROMPTS_ADMIN : QUICK_PROMPTS_TUTOR;

  return (
    <div className="ai-scheduler">
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-header-icon">🤖</div>
          <div>
            <h2 className="ai-header-title">AI Lịch Học</h2>
            <p className="ai-header-sub">
              {role === 'Admin' ? 'Quản lý toàn bộ lịch học với sự hỗ trợ của AI' : 'Sắp xếp lịch dạy thông minh với AI'}
            </p>
          </div>
        </div>
        <div className="ai-badge">
          <span className="ai-badge-dot"></span>
          Gemini Flash
        </div>
      </div>

      <div className="ai-body">
        {/* === CHAT PANEL === */}
        <div className="ai-chat-panel">
          <div className="ai-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ${msg.role === 'user' ? 'user-message' : 'ai-message-row'}`}>
                {msg.role === 'assistant' && <div className="ai-avatar">🤖</div>}
                <div className={`ai-bubble-content ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                  {renderMessageContent(msg.content)}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="ai-suggestion-hint">
                      💡 <strong>{msg.suggestions.length} gợi ý lịch</strong> — Xem bảng bên dưới để chỉnh sửa và lưu
                    </div>
                  )}
                </div>
                {msg.role === 'user' && <div className="user-avatar-icon">👤</div>}
              </div>
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="ai-quick-prompts">
            <p className="quick-prompts-label">Gợi ý nhanh:</p>
            <div className="quick-prompts-list">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  className="quick-prompt-btn"
                  onClick={() => sendMessage(prompt.replace(/^[^\s]+ /, ''))}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input area */}
          <div className="ai-input-area">
            <textarea
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập yêu cầu... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={2}
              disabled={isLoading}
            />
            <button
              className="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* === SUGGESTIONS PANEL === */}
        {editingSuggestions.length > 0 && (
          <div className="ai-suggestions-panel">
            <div className="suggestions-header">
              <div className="suggestions-title-row">
                <h3 className="suggestions-title">✨ Lịch gợi ý từ AI</h3>
                <span className="suggestions-count">{editingSuggestions.length} buổi</span>
              </div>
              <p className="suggestions-subtitle">Kiểm tra, chỉnh sửa rồi nhấn Lưu tất cả</p>
            </div>

            <div className="suggestions-list">
              {editingSuggestions.map((s) => (
                <div key={s._key} className="suggestion-card">
                  <button className="suggestion-remove" onClick={() => removeSuggestion(s._key)} title="Bỏ buổi này">✕</button>
                  <div className="suggestion-grid">
                    <div className="suggestion-field">
                      <label>📅 Ngày & Giờ bắt đầu</label>
                      <input
                        type="datetime-local"
                        value={s.dateTime || ''}
                        onChange={e => updateSuggestion(s._key, 'dateTime', e.target.value)}
                      />
                    </div>
                    <div className="suggestion-field">
                      <label>⏱ Giờ kết thúc</label>
                      <input
                        type="time"
                        value={s.endTime || ''}
                        onChange={e => updateSuggestion(s._key, 'endTime', e.target.value)}
                      />
                    </div>
                    <div className="suggestion-field">
                      <label>👨‍🏫 Gia sư</label>
                      <input
                        type="text"
                        value={s.tutorName || s.tutorId || ''}
                        readOnly
                        className="readonly-input"
                      />
                    </div>
                    <div className="suggestion-field">
                      <label>🎓 Học viên</label>
                      <input
                        type="text"
                        value={s.studentName || s.studentId || ''}
                        readOnly
                        className="readonly-input"
                      />
                    </div>
                    <div className="suggestion-field">
                      <label>🏠 Hình thức</label>
                      <select
                        value={s.learningFormat || 'Offline'}
                        onChange={e => updateSuggestion(s._key, 'learningFormat', e.target.value)}
                      >
                        <option value="Offline">Offline</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                    <div className="suggestion-field suggestion-field-full">
                      <label>📍 Địa điểm / Link</label>
                      <input
                        type="text"
                        value={s.address || ''}
                        onChange={e => updateSuggestion(s._key, 'address', e.target.value)}
                        placeholder="Nhập địa chỉ hoặc link meet..."
                      />
                    </div>
                    <div className="suggestion-field suggestion-field-full">
                      <label>📝 Nội dung buổi học</label>
                      <input
                        type="text"
                        value={s.note || ''}
                        onChange={e => updateSuggestion(s._key, 'note', e.target.value)}
                        placeholder="Ghi chú nội dung..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="suggestions-actions">
              <button className="btn-discard" onClick={() => setEditingSuggestions([])}>
                🗑 Bỏ tất cả
              </button>
              <button className="btn-save-all" onClick={saveAllSuggestions} disabled={isSaving}>
                {isSaving ? '⏳ Đang lưu...' : `💾 Lưu ${editingSuggestions.length} buổi học`}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .ai-scheduler {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 70px);
          background: #f0f4ff;
          border-radius: 16px;
          overflow: hidden;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }

        /* === HEADER === */
        .ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%);
          color: white;
          flex-shrink: 0;
        }
        .ai-header-left { display: flex; align-items: center; gap: 14px; }
        .ai-header-icon {
          width: 46px; height: 46px;
          background: rgba(255,255,255,0.18);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.25);
        }
        .ai-header-title { margin: 0; font-size: 1.25rem; font-weight: 700; }
        .ai-header-sub { margin: 2px 0 0; font-size: 0.78rem; opacity: 0.8; }
        .ai-badge {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 0.75rem; font-weight: 600;
          backdrop-filter: blur(8px);
        }
        .ai-badge-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        /* === BODY === */
        .ai-body {
          display: flex;
          flex: 1;
          overflow: hidden;
          gap: 0;
        }

        /* === CHAT PANEL === */
        .ai-chat-panel {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          background: white;
          border-right: 1px solid #e2e8f0;
        }

        .ai-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scroll-behavior: smooth;
        }

        .ai-message-row, .ai-message {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .user-message {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          flex-direction: row-reverse;
        }
        .ai-avatar, .user-avatar-icon {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .ai-avatar { background: linear-gradient(135deg, #1d4ed8, #0ea5e9); }
        .user-avatar-icon { background: linear-gradient(135deg, #7c3aed, #a855f7); }

        .ai-bubble-content {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 0.88rem;
          line-height: 1.6;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .ai-bubble {
          background: linear-gradient(135deg, #f0f7ff, #e8f4fd);
          color: #1e293b;
          border: 1px solid #bfdbfe;
          border-radius: 4px 16px 16px 16px;
        }
        .user-bubble {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          color: white;
          border-radius: 16px 4px 16px 16px;
          margin-left: auto;
        }

        .typing-indicator {
          display: flex; align-items: center; gap: 6px;
          padding: 14px 18px;
        }
        .typing-indicator span {
          width: 8px; height: 8px; border-radius: 50%;
          background: #94a3b8;
          animation: typing-bounce 1.2s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }

        .ai-suggestion-hint {
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          font-size: 0.8rem;
          color: #065f46;
        }

        /* Quick Prompts */
        .ai-quick-prompts {
          padding: 10px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fafbff;
          flex-shrink: 0;
        }
        .quick-prompts-label {
          font-size: 0.72rem; color: #94a3b8; margin: 0 0 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .quick-prompts-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .quick-prompt-btn {
          padding: 5px 10px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 0.75rem;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .quick-prompt-btn:hover:not(:disabled) {
          background: #eff6ff; border-color: #93c5fd; color: #1d4ed8;
          transform: translateY(-1px);
        }
        .quick-prompt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Input Area */
        .ai-input-area {
          display: flex; align-items: flex-end; gap: 10px;
          padding: 14px 16px;
          border-top: 1px solid #e2e8f0;
          background: white;
          flex-shrink: 0;
        }
        .ai-input {
          flex: 1;
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.88rem;
          resize: none;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
          line-height: 1.5;
          background: #f8faff;
        }
        .ai-input:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .ai-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .ai-send-btn {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
          border: none; border-radius: 12px;
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .ai-send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 4px 15px rgba(29,78,216,0.4); }
        .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ai-send-btn svg { animation-duration: 0.8s; animation-name: spin-send; animation-iteration-count: infinite; animation-timing-function: linear; }
        .ai-send-btn:not(:disabled) svg { animation: none; }
        @keyframes spin-send { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* === SUGGESTIONS PANEL === */
        .ai-suggestions-panel {
          width: 420px;
          min-width: 360px;
          display: flex;
          flex-direction: column;
          background: #f8faff;
          border-left: 2px solid #bfdbfe;
          overflow: hidden;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        .suggestions-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-bottom: 1px solid #bfdbfe;
          flex-shrink: 0;
        }
        .suggestions-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .suggestions-title { margin: 0; font-size: 1rem; font-weight: 700; color: #1e40af; }
        .suggestions-count {
          background: #1d4ed8; color: white;
          font-size: 0.72rem; font-weight: 700;
          padding: 2px 8px; border-radius: 20px;
        }
        .suggestions-subtitle { margin: 0; font-size: 0.78rem; color: #64748b; }

        .suggestions-list {
          flex: 1; overflow-y: auto;
          padding: 12px;
          display: flex; flex-direction: column; gap: 10px;
        }

        .suggestion-card {
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          position: relative;
          transition: box-shadow 0.2s;
        }
        .suggestion-card:hover { box-shadow: 0 4px 15px rgba(29,78,216,0.1); border-color: #93c5fd; }

        .suggestion-remove {
          position: absolute; top: 8px; right: 8px;
          width: 22px; height: 22px;
          background: #fee2e2; border: none; border-radius: 50%;
          color: #ef4444; cursor: pointer; font-size: 0.7rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .suggestion-remove:hover { background: #ef4444; color: white; }

        .suggestion-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .suggestion-field { display: flex; flex-direction: column; gap: 4px; }
        .suggestion-field-full { grid-column: 1 / -1; }
        .suggestion-field label {
          font-size: 0.7rem; font-weight: 600;
          color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;
        }
        .suggestion-field input,
        .suggestion-field select {
          padding: 7px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          font-family: inherit;
          background: #f8faff;
          transition: border-color 0.2s;
        }
        .suggestion-field input:focus,
        .suggestion-field select:focus { border-color: #3b82f6; background: white; }
        .readonly-input { background: #f1f5f9 !important; cursor: default; color: #475569; }

        .suggestions-actions {
          display: flex; gap: 10px;
          padding: 14px 16px;
          border-top: 1px solid #e2e8f0;
          background: white;
          flex-shrink: 0;
        }
        .btn-discard {
          flex: 1; padding: 10px;
          background: white; border: 1.5px solid #e2e8f0;
          border-radius: 10px; color: #64748b;
          cursor: pointer; font-weight: 600; font-size: 0.85rem;
          transition: all 0.2s;
        }
        .btn-discard:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
        .btn-save-all {
          flex: 2; padding: 10px;
          background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
          border: none; border-radius: 10px;
          color: white; cursor: pointer; font-weight: 700; font-size: 0.85rem;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(29,78,216,0.3);
        }
        .btn-save-all:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29,78,216,0.4); }
        .btn-save-all:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        /* === RESPONSIVE === */
        @media (max-width: 900px) {
          .ai-body { flex-direction: column; }
          .ai-suggestions-panel { width: 100%; min-width: unset; border-left: none; border-top: 2px solid #bfdbfe; max-height: 50%; }
          .ai-chat-panel { border-right: none; }
        }
      `}</style>
    </div>
  );
};

export default AIScheduler;
