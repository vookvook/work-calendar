import React, { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbxDyH7EB8PYT1Yjgal9xNhxT_tiwKgSOQL_jXAdmTyTMs_i-SG0IUSQ29z5Y_b8Choq/exec";

export default function WorkLogApp() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 데이터 키 설정 (2026-03 형식)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 시간 계산 (오전/오후 등 섞여도 숫자만 추출)
  const parseTime = (val) => {
    let str = String(val || "").trim();
    if (str.includes("오전") || str.includes("오후")) {
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
    // 공휴일 로직 (필요시 추가)
    return dayNum !== 0 && dayNum !== 6 && !hours[d];
  }).length;

  const diff = Number(target) - totalWorked;
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  // 데이터 로드
  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        setHours(data.hours || {});
        setTarget(data.target || "");
      }
    } catch (e) { console.error("불러오기 실패:", e); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    // Sticky 작동 방해 요소 강제 제거 CSS
    const style = document.createElement('style');
    style.innerHTML = `
      html, body { margin: 0; padding: 0; overflow-x: hidden; background-color: #f8fafc; }
      #root { display: block !important; overflow: visible !important; }
    `;
    document.head.appendChild(style);
    
    fetchFromServer();

    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
    return () => { if (document.head.contains(style)) document.head.removeChild(style); };
  }, [monthKey, fetchFromServer]);

  const saveAll = async () => {
    setLoading(true);
    try {
      await fetch(API_URL, { 
        method: "POST", 
        mode: "no-cors", 
        body: JSON.stringify({ month: monthKey, target, hours }) 
      });
      alert("성공적으로 저장되었습니다! 💾");
      fetchFromServer();
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", position: "relative" }}>
      
      {/* 📍 상단 고정 레이어 (Sticky Header) */}
      <div style={{ 
        position: "-webkit-sticky", position: "sticky", 
        top: 0, zIndex: 1000, 
        backgroundColor: "white", width: "100%", 
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)" 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" }}>
          <button style={{border:'none', background:'none', fontSize:'18px'}} onClick={() => setMonth(month - 1)}>◀</button>
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>{year}. {month + 1}</span>
          <button style={{border:'none', background:'none', fontSize:'18px'}} onClick={() => setMonth(month + 1)}>▶</button>
        </div>
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "12px", textAlign: "center", fontSize: "14px" }}>
           남은 평일 <b>{remainingWeekdays}일</b> 동안 하루 <b>{suggested}시간</b> 권장
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* 요약 카드 */}
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "20px", borderRadius: "20px", color: "white", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
            <span>목표</span>
            <input type="text" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "60px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "5px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><small>누적</small><div style={{fontSize:'22px', fontWeight:'bold'}}>{totalWorked.toFixed(1)}h</div></div>
            <div style={{textAlign:'right'}}><small>남은</small><div style={{fontSize:'22px', fontWeight:'bold'}}>{(diff > 0 ? diff : 0).toFixed(1)}h</div></div>
          </div>
        </div>

        {/* 날짜 리스트 */}
        <div style={{ background: "white", borderRadius: "15px", border: "1px solid #eee" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const isWeekend = dayNum === 0 || dayNum === 6;
            const isToday = new Date().getDate() === date && isCurrentMonth;
            return (
              <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #f9f9f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
                <span style={{ color: dayNum === 0 ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#333") }}>{date} ({weekDays[dayNum]})</span>
                {!isWeekend ? (
                  <input type="text" value={hours[date] || ""} onChange={e => setHours({ ...hours, [date]: e.target.value })} style={{ width: "70px", textAlign: "right", border: "1px solid #ddd", borderRadius: "5px", padding: "5px" }} placeholder={suggested} />
                ) : <span style={{color:'#ccc'}}>OFF</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", padding: "15px", boxSizing: "border-box", display: "flex", gap: "10px", background: "white", borderTop: "1px solid #eee", zIndex: 1001 }}>
        <button onClick={fetchFromServer} style={{ padding: "15px", borderRadius: "10px", border: "1px solid #ddd", background: "white" }}>🔄</button>
        <button onClick={saveAll} style={{ flex: 1, padding: "15px", borderRadius: "10px", border: "none", background: "#1e293b", color: "white", fontWeight: "bold" }}>저장하기</button>
      </div>
    </div>
  );
}
