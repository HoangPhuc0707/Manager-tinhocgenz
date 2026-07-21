const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const askAISchedule = async ({ message, role, tutorId, conversationHistory }) => {
  const res = await fetch(`${API_BASE}/api/ai/schedule-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, role, tutorId, conversationHistory })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Lỗi kết nối AI');
  }
  return res.json(); // { reply: string, suggestions: Lesson[] }
};
