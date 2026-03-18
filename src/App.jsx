import { useState, useEffect } from "react";

// 배포 후 받은 새로운 URL로 교체하세요!
const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 2026년 공휴일 데이터
  const getKoreanHolidays = (y, m) => {
    if (y === 2026) {
      const holidays2026 = {
        1: [1], 2: [16, 17, 18], 3: [1, 2], 5: [5, 25],
        6: [3, 6], 8: [15, 17], 9: [24, 25, 26], 10: [3, 5, 9], 12: [25]
      };
      return holidays2026[m + 1] || [];
    }
    return [];
  };
  const holidays = getKoreanHolidays(year, month);

  // 데이터 불러오기
  const loadHours = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}`);
      const data = await res.json();
      setHours(data.hours || {});
      setTarget(data.target || "");
    } catch (e) {
      console.error("불러오기 실패", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHours();
  }, [year, month]);

  // ✨ 핵심 수정: 모든 데이터를 한 번에 전송
  const saveAll = async () => {
    setLoading(true);
    try {
      // GAS POST 요청은 'no-cors'를 쓰면 응답 확인이 안 되므로 
      // 기본 fetch를 쓰되, 서버에서 JSON 응답을 잘 주도록 구성해야 함
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          month: monthKey,
          target: target,
          hours: hours
        }),
      });
      alert("성공적으로 저장되었습니다!");
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  // 헬퍼 함수들
  const isWeekend = (d) => [0, 6].includes(new Date(year, month, d).getDay());
  const isHoliday = (d) => holidays.includes(d);
  const parseTime = (str) => {
    if (!str || typeof str !== 'string' || !str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return h + (m || 0) / 60;
  };
  const formatTime = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}:${mm.toString().padStart(2, "0")}`;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const remainingHours = target ? target - totalWorked : 0;
  const workingDays = dates.filter(d => !isWeekend(d) && !isHoliday(d));
  const enteredDates = Object.keys(hours).map(Number);
  const remainingWorkingDays = workingDays.filter(d => !enteredDates.includes(d));
  const dynamicDailyTarget = remainingWorkingDays.length > 0 && target ? remainingHours / remainingWorkingDays.length : 0;

  return (
    <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "20px", fontSize: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>◀</button>
        <h2>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>▶</button>
      </div>

      <div style={{ margin: "20px 0" }}>
        목표 시간: 
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} style={{ marginLeft: "10px", fontSize: "20px", width: "100px" }} />
      </div>

      <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
        <div>총 근무: <b>{totalWorked.toFixed(2)}h</b></div>
        <div>남은 시간: <b style={{ color: "red" }}>{remainingHours.toFixed(2)}h</b></div>
      </div>

      {dates.map(date => {
        const off = isWeekend(date) || isHoliday(date);
        return (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #eee", background: off ? "#f9f9f9" : "white" }}>
            <span>{date}일 ({["일", "월", "화", "수", "목", "금", "토"][new Date(year, month, date).getDay()]})</span>
            {!off && (
              <input 
                type="text" 
                value={hours[date] || ""} 
                placeholder={formatTime(dynamicDailyTarget)}
                onChange={(e) => setHours({ ...hours, [date]: e.target.value })}
                style={{ width: "80px", textAlign: "center" }}
              />
            )}
          </div>
        );
      })}

      <button 
        onClick={saveAll} 
        disabled={loading}
        style={{ width: "100%", height: "60px", marginTop: "20px", background: "#2563eb", color: "white", borderRadius: "10px", fontSize: "20px", cursor: "pointer" }}
      >
        {loading ? "저장 중..." : "구글 시트에 저장하기"}
      </button>
    </div>
  );
}
