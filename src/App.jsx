import { useState, useEffect, useCallback } from "react";

// ⚠️ 본인의 API URL을 그대로 유지하세요!
const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 한국 공휴일 로직 (2025~2026)
  const getHolidayName = (d) => {
    const ymd = `${year}-${month + 1}-${d}`;
    const mmdd = `${month + 1}-${d}`;
    const fixed = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "성탄절" };
    if (fixed[mmdd]) return fixed[mmdd];
    const special = {
      "2025-1-30": "대체공휴일", "2025-5-6": "대체공휴일", "2025-10-6": "대체공휴일",
      "2026-2-19": "대체공휴일", "2026-5-25": "대체공휴일", "2026-9-28": "대체공휴일"
    };
    return special[ymd] || null;
  };

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
        alert("서버 데이터를 가져왔습니다!");
      }
    } catch (e) { alert("불러오기 실패"); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    } else {
      setHours({}); setTarget("");
    }
  }, [monthKey]);

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
      alert("서버 저장 완료!");
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  const parseTime = (val) => {
    const str = String(val || "").trim();
    if (!str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);

  return (
    <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "10px 10px 120px 10px", boxSizing: "border-box", backgroundColor: "#fff", minHeight: "100vh" }}>
      
      {/* 📅 월 이동 (상단 고정 느낌으로 크게) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "2px solid #eee" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ fontSize: "30px", background: "none", border: "none", padding: "10px" }}>◀</button>
        <h1 style={{ fontSize: "32px", margin: 0, fontWeight: "900" }}>{year}. {month + 1}</h1>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ fontSize: "30px", background: "none", border: "none", padding: "10px" }}>▶</button>
      </div>

      {/* 📊 메인 요약 (화면 꽉 차게) */}
      <div style={{ background: "#000", color: "#fff", padding: "30px 20px", borderRadius: "0", margin: "0 -10px 20px -10px", textAlign: "center" }}>
        <div style={{ fontSize: "20px", color: "#aaa", marginBottom: "10px" }}>목표 {target || 0}시간 중</div>
        <div style={{ fontSize: "64px", fontWeight: "900" }}>{totalWorked.toFixed(1)}<span style={{ fontSize: "24px" }}>h</span></div>
        <div style={{ fontSize: "22px", marginTop: "10px", color: "#00ff88" }}>잔여: {(target - totalWorked).toFixed(1)}h</div>
        <div style={{ marginTop: "15px" }}>
           <input 
            type="number" 
            placeholder="목표시간"
            value={target} 
            onChange={e => setTarget(e.target.value)} 
            style={{ width: "120px", fontSize: "20px", padding: "10px", textAlign: "center", borderRadius: "8px", border: "1px solid #444", background: "#222", color: "#fff" }} 
          />
        </div>
      </div>

      {/* 📝 리스트 (텍스트 크기 강조) */}
      <div>
        {dates.map(date => {
          const holiday = getHolidayName(date);
          const dayNum = new Date(year, month, date).getDay();
          const isWeekend = dayNum === 0 || dayNum === 6;
          const isToday = new Date().getDate() === date && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 5px", borderBottom: "1px solid #eee", backgroundColor: isToday ? "#ffffcc" : "transparent" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "26px", fontWeight: "800", color: holiday || dayNum === 0 ? "red" : dayNum === 6 ? "blue" : "#000" }}>
                  {date}
                </span>
                {holiday && <div style={{ fontSize: "14px", color: "red", fontWeight: "bold" }}>{holiday}</div>}
              </div>

              {!holiday && !isWeekend ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "110px", height: "55px", fontSize: "24px", textAlign: "right", border: "2px solid #ddd", borderRadius: "10px", padding: "0 10px" }}
                    placeholder="0:00"
                  />
                  {/* 개별 초기화 버튼 */}
                  <button 
                    onClick={() => setHours({ ...hours, [date]: "" })}
                    style={{ width: "50px", height: "55px", fontSize: "20px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "10px" }}
                  >
                    🔄
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: "20px", color: "#ccc", fontWeight: "bold", marginRight: "20px" }}>OFF</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔘 하단 고정 버튼 바 */}
      <div style={{ position: "fixed", bottom: "0", left: "0", width: "100%", display: "flex", padding: "15px", boxSizing: "border-box", background: "white", borderTop: "2px solid #eee", gap: "10px", zIndex: 1000 }}>
        <button 
          onClick={fetchFromServer}
          disabled={loading}
          style={{ width: "80px", height: "70px", fontSize: "30px", backgroundColor: "#fff", border: "2px solid #000", borderRadius: "15px" }}
        >
          {loading ? "..." : "🔄"}
        </button>
        <button 
          onClick={saveAll} 
          disabled={loading}
          style={{ flex: 1, height: "70px", backgroundColor: "#000", color: "#fff", fontSize: "24px", fontWeight: "bold", borderRadius: "15px", border: "none" }}
        >
          {loading ? "기록 중" : "서버 저장"}
        </button>
      </div>

    </div>
  );
}
