import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ✨ 오늘 날짜로 스크롤하기 위한 참조(Ref)
  const todayRef = useRef(null);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 🇰🇷 2026년 공휴일 로직 (유지)
  const getHolidayName = (d) => {
    const ymd = `${year}-${month + 1}-${d}`;
    const mmdd = `${month + 1}-${d}`;
    const fixed = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-3": "지방선거", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "성탄절" };
    if (fixed[mmdd]) return fixed[mmdd];
    const special2026 = {
      "2026-2-16": "설날연휴", "2026-2-17": "설날", "2026-2-18": "설날연휴", "2026-2-19": "대체공휴일",
      "2026-3-2": "대체공휴일(삼일절)", "2026-5-25": "대체공휴일(부처님오신날)", "2026-8-17": "대체공휴일(광복절)",
      "2026-9-24": "추석연휴", "2026-9-25": "추석", "2026-9-26": "추석연휴", "2026-10-5": "대체공휴일(개천절)"
    };
    return special2026[ymd] || null;
  };

  // 🚀 [추가] 오늘 날짜로 이동하는 함수
  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // 데이터 불러오기
  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    }
    // 월이 바뀌거나 로딩 직후 오늘 날짜가 있으면 스크롤 실행 (약간의 지연시간 부여)
    setTimeout(scrollToToday, 500);
  }, [monthKey]);

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
      alert("저장 성공! 💾");
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
    <div style={{ width: "100vw", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "180px", boxSizing: "border-box", overflowX: "hidden" }}>
      
      {/* 📅 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "50px 40px", backgroundColor: "white", borderBottom: "3px solid #e2e8f0" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ fontSize: "50px", background: "none", border: "none" }}>◀</button>
        <h1 style={{ fontSize: "50px", fontWeight: "900", margin: 0 }}>{year}. {month + 1}</h1>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ fontSize: "50px", background: "none", border: "none" }}>▶</button>
      </div>

      {/* 📊 요약 카드 */}
      <div style={{ padding: "30px 40px" }}>
        <div style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", padding: "50px 30px", borderRadius: "35px", color: "white", boxShadow: "0 20px 40px rgba(37, 99, 235, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <span style={{ fontSize: "32px", fontWeight: "bold" }}>목표 시간</span>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "140px", fontSize: "40px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "12px", padding: "10px" }} />
          </div>
          <div style={{ fontSize: "100px", fontWeight: "950", lineHeight: 1 }}>{totalWorked.toFixed(1)}<span style={{ fontSize: "36px", fontWeight: "400", marginLeft: "15px" }}>h</span></div>
          <div style={{ fontSize: "28px", marginTop: "25px", opacity: 0.9 }}>잔여: <span style={{ fontWeight: "bold", borderBottom: "4px solid #60a5fa" }}>{(target - totalWorked).toFixed(1)}h</span></div>
        </div>
      </div>

      {/* 📝 날짜 리스트 */}
      <div style={{ backgroundColor: "white", width: "100%" }}>
        {dates.map(date => {
          const holiday = getHolidayName(date);
          const dayNum = new Date(year, month, date).getDay();
          const isWeekend = dayNum === 0 || dayNum === 6;
          const isToday = new Date().getDate() === date && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div 
              key={date} 
              // ✨ 오늘 날짜인 경우에만 Ref를 연결합니다.
              ref={isToday ? todayRef : null}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "35px 40px", borderBottom: "2px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "48px", fontWeight: "900", color: holiday || dayNum === 0 ? "#ef4444" : dayNum === 6 ? "#3b82f6" : "#1e293b" }}>
                  {date}
                </span>
                {holiday && <div style={{ fontSize: "18px", color: "#ef4444", fontWeight: "bold", marginTop: "8px" }}>{holiday}</div>}
              </div>

              {!holiday && !isWeekend ? (
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <input type="text" inputMode="decimal" value={hours[date] || ""} onChange={e => setHours({ ...hours, [date]: e.target.value })} style={{ width: "160px", height: "90px", fontSize: "40px", textAlign: "right", border: "4px solid #e2e8f0", borderRadius: "20px", padding: "0 20px", outline: "none" }} placeholder="0:00" />
                  <button onClick={() => setHours({ ...hours, [date]: "" })} style={{ width: "80px", height: "90px", fontSize: "36px", background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: "20px", color: "#94a3b8" }}>🔄</button>
                </div>
              ) : (
                <span style={{ fontSize: "32px", color: "#cbd5e1", fontWeight: "bold" }}>OFF</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔘 하단 고정 버튼 바 */}
      <div style={{ position: "fixed", bottom: "0", left: "0", width: "100%", display: "flex", padding: "30px 40px", boxSizing: "border-box", background: "white", borderTop: "2px solid #e2e8f0", gap: "25px", zIndex: 1000 }}>
        <button onClick={fetchFromServer} disabled={loading} style={{ width: "120px", height: "120px", fontSize: "50px", backgroundColor: "white", border: "3px solid #e2e8f0", borderRadius: "24px", display: "flex", justifyContent: "center", alignItems: "center" }}>{loading ? "..." : "🔄"}</button>
        <button onClick={saveAll} disabled={loading} style={{ flex: 1, height: "120px", backgroundColor: "#1e293b", color: "white", fontSize: "40px", fontWeight: "900", borderRadius: "24px", border: "none", boxShadow: "0 10px 20px rgba(0,0,0,0.15)" }}>{loading ? "기록 중" : "저장하기"}</button>
      </div>

    </div>
  );
}
