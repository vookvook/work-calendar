import { useState, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbx9jBIc5_3NYDhu2BYr4Tbqu4pvvrOJo3H4kMgLcY8hQ_u0jD4O91lTBpXU97KV3lCv/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
        alert("최신 데이터를 불러왔습니다!");
      }
    } catch (e) {
      alert("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    }
  }, [monthKey]);

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
      alert("저장 성공!");
    } catch (e) {
      alert("저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const parseTime = (val) => {
    const str = String(val || "").trim();
    if (!str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);

  return (
    <div style={{ maxWidth: "450px", margin: "0 auto", padding: "15px", fontFamily: "sans-serif" }}>
      <button onClick={fetchFromServer} style={{ width: "100%", height: "45px", marginBottom: "15px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
        ☁️ 구글 시트에서 불러오기
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>◀</button>
        <h2 style={{ fontSize: "1.1rem" }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>▶</button>
      </div>

      <div style={{ background: "#f1f5f9", padding: "15px", borderRadius: "10px", margin: "15px 0" }}>
        <div>목표: <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "55px" }} /> h</div>
        <div style={{ marginTop: "5px", fontSize: "14px" }}>
          현재: <b>{totalWorked.toFixed(2)}h</b> / 남은: <b style={{ color: "red" }}>{(target - totalWorked).toFixed(2)}h</b>
        </div>
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee", borderRadius: "8px", background: "white" }}>
        {dates.map(date => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #f8f8f8" }}>
            <span>{date}일</span>
            <input type="text" value={hours[date] || ""} onChange={e => setHours({ ...hours, [date]: e.target.value })} style={{ width: "65px", textAlign: "right" }} placeholder="0:00" />
          </div>
        ))}
      </div>

      <button onClick={saveAll} style={{ width: "100%", height: "55px", marginTop: "15px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
        서버에 저장하기
      </button>
    </div>
  );
}
