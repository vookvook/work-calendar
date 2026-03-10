import { useState } from "react";

export default function App() {
  const year = 2026;
  const month = 2; // 0부터 시작 (2 = 3월)

  const days = ["일","월","화","수","목","금","토"];

  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  const [target, setTarget] = useState(169);
  const [hours, setHours] = useState({});

  const handleChange = (date, value) => {
    setHours({
      ...hours,
      [date]: Number(value)
    });
  };

  const total = Object.values(hours).reduce((a,b)=>a+b,0);
  const remain = target - total;

  return (
    <div style={{ padding:40, fontFamily:"sans-serif", maxWidth:900, margin:"auto" }}>

      <h1>2026년 3월 근무시간</h1>

      <div style={{ marginBottom:20 }}>
        목표 근무시간
        <input
          value={target}
          onChange={(e)=>setTarget(Number(e.target.value))}
          style={{ marginLeft:10, width:80 }}
        />
      </div>

      <div style={{ marginBottom:20 }}>
        총 근무시간: <b>{total}시간</b>
        <br/>
        남은 시간: <b>{remain}시간</b>
      </div>

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(7,1fr)",
          gap:8
        }}
      >
        {days.map((d)=>(
          <div key={d} style={{ fontWeight:"bold", textAlign:"center" }}>
            {d}
          </div>
        ))}

        {dates.map((date)=>{

          const day = new Date(year,month,date).getDay();
          const weekend = day === 0 || day === 6;

          return (
            <div
              key={date}
              style={{
                border:"1px solid #ddd",
                padding:10,
                background: weekend ? "#f3f3f3" : "white"
              }}
            >
              <div>{date}</div>

              <input
                type="number"
                placeholder="시간"
                value={hours[date] || ""}
                onChange={(e)=>handleChange(date,e.target.value)}
                style={{ width:"60px" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
