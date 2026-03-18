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

  // 🇰🇷 한국 공휴일 및 대체공휴일 체크 (2025-2026 주요 날짜)
  const getHolidayName = (d) => {
    const ymd = `${year}-${month + 1}-${d}`;
    const mmdd = `${month + 1}-${d}`;
    const fixed = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "성탄절" };
    if (fixed[mmdd]) return fixed[mmdd];

    const special = {
      "2025-1-27": "설날연휴", "2025-1-28": "설날", "2025-1-29": "설날연휴", "2025-1-30": "대체공휴일",
      "2025-5-6": "대체공휴일", "2025-10-6": "대체공휴일",
      "2026-2-16": "설날연휴", "2026-2-17": "설날", "2026-2-18": "설날연휴", "2026-2-19": "대체공휴일",
      "2026-5-25": "대체공휴일", "2026-9-28": "대체공휴일"
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
        alert("데이터를 동기화했습니다. 🔄");
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
    }
  }, [monthKey]);

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
      alert("성공적으로 저장되었습니다! 💾");
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
  const getDayColor = (d) => {
    const day = new Date(year, month, d).getDay();
    if (getHolidayName(d) || day === 0) return "#ff4d4f"; // 일요일/공휴일 빨간색
    if (day === 6) return "#1890ff"; // 토요일 파란색
    return "#262626";
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px 20px 100px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      
      {/* 📅 월 선택 섹션 - 글자 크기 키움 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", marginTop: "10px" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ padding: "10px 15px", border: "none", background: "white", borderRadius: "10px", fontSize: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>◀</button>
        <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "bold" }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ padding: "10px 15px", border: "none", background: "white", borderRadius: "10px", fontSize: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>▶</button>
      </div>

      {/* 📊 요약 카드 - 시원시원한 디자인 */}
      <div style={{ background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)", padding: "25px", borderRadius: "20px", color: "white", marginBottom: "30px", boxShadow: "0 10px 20px rgba(24,144,255,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <span style={{ fontSize: "18px", opacity: 0.9 }}>목표 시간 설정</span>
          <input 
            type="number" 
            value={target} 
            onChange={e => setTarget(e.target.value)} 
            style={{ width: "80px", fontSize: "20px", background: "rgba(255,255,255,0.2)", border: "none", borderBottom: "2px solid white", color: "white", textAlign: "right", outline: "none", padding: "2px" }} 
          />
        </div>
        <div style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "10px" }}>{totalWorked.toFixed(1)}<span style={{ fontSize: "20px", marginLeft: "5px" }}>h</span></div>
        <div style={{ fontSize: "16px", opacity: 0.9 }}>남은 시간: <b>{(target - totalWorked).toFixed(1)}h</b></div>
      </div>

      {/* 📝 일일 리스트 - 간격과 글자 확대 */}
      <div style={{ backgroundColor: "white", borderRadius: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {dates.map(date => {
          const holiday = getHolidayName(date);
          const dayNum = new Date(year, month, date).getDay();
          const isWeekend = dayNum === 0 || dayNum === 6;
          const isToday = new Date().getDate() === date && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #f0f0f0", backgroundColor: isToday ? "#e6f7ff" : "white" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "20px", fontWeight: isToday ? "bold" : "500", color: getDayColor(date) }}>
                  {date}일 {isToday && <small style={{ fontSize: "12px", color: "#1890ff", verticalAlign: "middle" }}> TODAY</small>}
                </span>
                {holiday && <span style={{ fontSize: "13px", color: "#ff4d4f", marginTop: "2px" }}>{holiday}</span>}
              </div>

              {!holiday && !isWeekend ? (
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={hours[date] || ""} 
                  onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                  style={{ width: "90px", height: "45px", fontSize: "18px", textAlign: "right", border: "1px solid #d9d9d9", borderRadius: "10px", padding: "0 10px", outline: "none", backgroundColor: "#fafafa" }}
                  placeholder="0:00"
                />
              ) : (
                <span style={{ fontSize: "16px", color: "#bfbfbf", fontWeight: "bold" }}>OFF</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔘 하단 플로팅 버튼 바 (새로고침 + 저장 나란히) */}
      <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: "450px", display: "flex", gap: "10px", zIndex: 100 }}>
        {/* 불러오기 아이콘 버튼 */}
        <button 
          onClick={fetchFromServer}
          disabled={loading}
          style={{ width: "65px", height: "65px", backgroundColor: "white", border: "1px solid #d9d9d9", borderRadius: "18px", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", fontSize: "28px", cursor: "pointer" }}
        >
          {loading ? "..." : "🔄"}
        </button>
        
        {/* 저장하기 버튼 */}
        <button 
          onClick={saveAll} 
          disabled={loading}
          style={{ flex: 1, height: "65px", backgroundColor: "#001529", color: "white", border: "none", borderRadius: "18px", fontSize: "20px", fontWeight: "bold", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", cursor: "pointer" }}
        >
          {loading ? "저장 중..." : "데이터 서버에 저장하기"}
        </button>
      </div>

    </div>
  );
}
