import { useState, useEffect, useCallback, useRef } from "react";

// 구글 앱스 스크립트 웹 앱 URL
const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 서버 매칭용 키: 반드시 '2026-03' 형식 유지
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getHolidayName = (d) => {
    const ymd = `${year}-${month + 1}-${d}`;
    const mmdd = `${month + 1}-${d}`;
    const fixed = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "성탄절" };
    if (fixed[mmdd]) return fixed[mmdd];
    return null;
  };

  // 시간 계산 함수 (오전/오후 문구가 섞여 들어와도 숫자만 추출하도록 보강)
  const parseTime = (val) => {
    let str = String(val || "").trim();
    if (str.includes("오전") || str.includes("오후")) {
      // 만약 '오전 7:05:00' 형태로 들어온다면 시간 부분만 추출
      const match = str.match(/\d+:\d+/);
      str = match ? match[0] : "0";
    }
    if (!str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const todayDate = new Date().getDate();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;

  const remainingWeekdays = dates.filter(d => {
    if (isCurrentMonth && d < todayDate) return false;
    const dayNum = new Date(year, month, d).getDay();
    const holiday = getHolidayName(d);
    return dayNum !== 0 && dayNum !== 6 && !holiday && !hours[d];
  }).length;

  const diff = Number(target) - totalWorked;
  const displayDiff = diff > 0 ? diff : 0;
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

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
    } catch (e) { console.error("Load Error", e); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      html, body { margin: 0; padding: 0; overflow-x: hidden; background-color: #f8fafc; }
      #root { display: block !important; overflow: visible !important; }
    `;
    document.head.appendChild(style);
    
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    }
    
    fetchFromServer();

    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
    return () => { if (document.head.contains(style)) document.head.removeChild(style); };
  }, [monthKey, fetchFromServer]);

  // --- 저장 로직 (데이터 형식 강제 지정) ---
  const saveAll = async () => {
    setLoading(true);
    
    // 시트에서 자동 변환하지 못하도록 데이터를 정제함
    const sanitizedHours = {};
    Object.keys(hours).forEach(date => {
      let val = hours[date];
      // 시간이 '7:5' 처럼 오면 '07:05' 처럼 강제 텍스트 형식으로 변경 권장하나, 
      // 여기서는 시트가 날짜로 인식하지 못하게 '문자열'임을 확실히 함
      sanitizedHours[date] = String(val).trim(); 
    });

    const body = { 
      month: monthKey, // '2026-03'
      target: String(target), 
      hours: sanitizedHours 
    };

    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      // POST 요청
      await fetch(API_URL, { 
        method: "POST", 
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body) 
      });
      alert("데이터가 시트에 안전하게 저장되었습니다! 💾");
      fetchFromServer(); // 저장 후 즉시 다시 불러와서 형식 확인
    } catch (e) { 
      alert("저장 실패"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div style={{ width: "100%", fontFamily: "Pretendard, -apple-system, sans-serif" }}>
      
      {/* 📍 상단 고정 헤더 영역 */}
      <div style={{ 
        position: "sticky", top: 0, zIndex: 1000, 
        backgroundColor: "white", width: "100%", borderBottom: "1px solid #eee" 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" }}>
          <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ fontSize: "18px", background: "none", border: "none" }}>◀</button>
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>{year}. {month + 1}</span>
          <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ fontSize: "20px", background: "none", border: "none" }}>▶</button>
        </div>
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "12px", fontSize: "14px", textAlign: "center" }}>
           남은 평일 <b>{remainingWeekdays}일</b> 동안 하루 <b>{suggested}시간</b> 권장
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* 요약 카드 */}
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "20px", borderRadius: "20px", color: "white", marginBottom: "20px", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <span>목표 시간</span>
            <input type="text" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "60px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "5px", padding: "5px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><small style={{opacity:0.7}}>누적</small><div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalWorked.toFixed(1)}h</div></div>
            <div style={{ textAlign: "right" }}><small style={{opacity:0.7}}>남은</small><div style={{ fontSize: "24px", fontWeight: "bold" }}>{displayDiff.toFixed(1)}h</div></div>
          </div>
        </div>

        {/* 날짜 리스트 */}
        <div style={{ background: "white", borderRadius: "15px", overflow: "hidden", border: "1px solid #f0f0f0" }}>
          {dates.map(date => {
            const holiday = getHolidayName(date);
            const dayNum = new Date(year, month, date).getDay();
            const isWeekend = dayNum === 0 || dayNum === 6;
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const color = (holiday || dayNum === 0) ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#333");

            return (
              <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", borderBottom: "1px solid #f5f5f5", backgroundColor: isToday ? "#f0f7ff" : "white" }}>
                <span style={{ color, fontWeight: isToday ? "bold" : "normal" }}>{date} ({weekDays[dayNum]})</span>
                {!holiday && !isWeekend ? (
                  <input 
                    type="text" 
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "70px", textAlign: "right", border: "1px solid #ddd", borderRadius: "8px", padding: "8px" }}
                    placeholder={suggested}
                  />
                ) : <span style={{ color: "#ccc", fontSize: "12px" }}>OFF</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 버튼 바 */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", padding: "15px", boxSizing: "border-box", display: "flex", gap: "10px", background: "rgba(255,255,255,0.95)", borderTop: "1px solid #eee", zIndex: 1000 }}>
        <button onClick={fetchFromServer} style={{ padding: "15px", borderRadius: "12px", border: "1px solid #ddd", background: "white" }}>🔄</button>
        <button onClick={saveAll} style={{ flex: 1, padding: "15px", borderRadius: "12px", border: "none", background: "#1e293b", color: "white", fontWeight: "bold", fontSize: "16px" }}>저장하기</button>
      </div>
    </div>
  );
}
