import { useState, useEffect, useCallback } from "react";

// ⚠️ 본인의 API URL을 유지하세요!
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
        alert("최신 정보를 가져왔습니다! ✨");
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
      alert("서버에 안전하게 저장했습니다! 💾");
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
    <div style={{ width: "100vw", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "120px", boxSizing: "border-box", overflowX: "hidden" }}>
      
      {/* 📅 헤더: 월 선택 (디자인 복구) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", backgroundColor: "white", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ fontSize: "24px", background: "none", border: "none" }}>◀</button>
        <h1 style={{ fontSize: "26px", fontWeight: "800", margin: 0 }}>{year}년 {month + 1}월</h1>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ fontSize: "24px", background: "none", border: "none" }}>▶</button>
      </div>

      {/* 📊 요약 카드 (이전의 예쁜 디자인) */}
      <div style={{ padding: "20px" }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", padding: "30px 20px", borderRadius: "20px", color: "white", boxShadow: "0 10px 25px rgba(37, 99, 235, 0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <span style={{ fontSize: "20px", opacity: 0.9 }}>목표 시간</span>
            <input 
              type="number" 
              value={target} 
              onChange={e => setTarget(e.target.value)} 
              style={{ width: "90px", fontSize: "24px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px" }} 
            />
          </div>
          <div style={{ fontSize: "56px", fontWeight: "900" }}>{totalWorked.toFixed(1)}<span style={{ fontSize: "24px", fontWeight: "400" }}>h</span></div>
          <div style={{ fontSize: "18px", marginTop: "5px", opacity: 0.8 }}>잔여: <span style={{ fontWeight: "bold" }}>{(target - totalWorked).toFixed(1)}h</span></div>
        </div>
      </div>

      {/* 📝 날짜 리스트 (화면 너비 100% 꽉 채우기) */}
      <div style={{ backgroundColor: "white", width: "100%" }}>
        {dates.map(date => {
          const holiday = getHolidayName(date);
          const dayNum = new Date(year, month, date).getDay();
          const isWeekend = dayNum === 0 || dayNum === 6;
          const isToday = new Date().getDate() === date && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "28px", fontWeight: "800", color: holiday || dayNum === 0 ? "#ef4444" : dayNum === 6 ? "#3b82f6" : "#1e293b" }}>
                  {date}
                </span>
                {holiday && <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold" }}>{holiday}</div>}
              </div>

              {!holiday && !isWeekend ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "100px", height: "55px", fontSize: "24px", textAlign: "right", border: "2px solid #e2e8f0", borderRadius: "12px", padding: "0 10px", outline: "none" }}
                    placeholder="0:00"
                  />
                  {/* 개별 초기화 버튼 */}
                  <button 
                    onClick={() => setHours({ ...hours, [date]: "" })}
                    style={{ width: "50px", height: "55px", fontSize: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", color: "#94a3b8" }}
                  >
                    🔄
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: "18px", color: "#cbd5e1", fontWeight: "bold", paddingRight: "10px" }}>OFF</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔘 하단 고정 버튼 바 (꽉 차게) */}
      <div style={{ position: "fixed", bottom: "0", left: "0", width: "100%", display: "flex", padding: "20px", boxSizing: "border-box", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #e2e8f0", gap: "10px", zIndex: 1000 }}>
        <button 
          onClick={fetchFromServer}
          disabled={loading}
          style={{ width: "70px", height: "70px", fontSize: "28px", backgroundColor: "white", border: "2px solid #e2e8f0", borderRadius: "20px", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
          {loading ? "..." : "🔄"}
        </button>
        <button 
          onClick={saveAll} 
          disabled={loading}
          style={{ flex: 1, height: "70px", backgroundColor: "#1e293b", color: "white", fontSize: "22px", fontWeight: "800", borderRadius: "20px", border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}
        >
          {loading ? "저장 중..." : "서버 저장하기"}
        </button>
      </div>

    </div>
  );
}
