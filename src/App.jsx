import { useState, useEffect } from "react";

export default function App() {

  // 한국 시간 기준 현재 날짜
  const now = new Date(
    new Date().toLocaleString("en-US",{timeZone:"Asia/Seoul"})
  );

  const [year,setYear] = useState(now.getFullYear());
  const [month,setMonth] = useState(now.getMonth());

  const daysInMonth = new Date(year,month+1,0).getDate();
  const dates = Array.from({length:daysInMonth},(_,i)=>i+1);

  const holidays = [1,2];

  const savedHours = JSON.parse(localStorage.getItem("workHours")) || {};
  const savedTarget = localStorage.getItem("target");

  const defaultTarget =
    year===2026 && month===2 ? 169 : "";

  const [target,setTarget] = useState(
    savedTarget!==null ? savedTarget : defaultTarget
  );

  const [hours,setHours] = useState(savedHours);

  useEffect(()=>{
    localStorage.setItem("workHours",JSON.stringify(hours));
  },[hours]);

  useEffect(()=>{
    localStorage.setItem("target",target);
  },[target]);

  const prevMonth=()=>{
    if(month===0){
      setMonth(11);
      setYear(year-1);
    }else{
      setMonth(month-1);
    }
  };

  const nextMonth=()=>{
    if(month===11){
      setMonth(0);
      setYear(year+1);
    }else{
      setMonth(month+1);
    }
  };

  const isWeekend=(date)=>{
    const day=new Date(year,month,date).getDay();
    return day===0||day===6;
  };

  const isHoliday=(date)=>{
    return holidays.includes(date);
  };

  const parseTime=(str)=>{
    if(!str) return 0;
    const parts=str.split(":");
    const h=Number(parts[0])||0;
    const m=Number(parts[1])||0;
    return h+m/60;
  };

  const formatTime=(h)=>{
    const hh=Math.floor(h);
    const mm=Math.round((h-hh)*60);
    return `${hh}:${mm.toString().padStart(2,"0")}`;
  };

  const workingDays=dates.filter(
    d=>!isWeekend(d)&&!isHoliday(d)
  );

  const enteredDates=Object.keys(hours).map(Number);

  const remainingWorkingDays=workingDays.filter(
    d=>!enteredDates.includes(d)
  );

  const totalWorked=Object.values(hours)
    .map(parseTime)
    .reduce((a,b)=>a+b,0);

  const remainingHours=
    target ? target-totalWorked : 0;

  const dynamicDailyTarget=
    remainingWorkingDays.length>0 && target
      ? remainingHours/remainingWorkingDays.length
      : 0;

  const handleChange=(date,val)=>{
    setHours({
      ...hours,
      [date]:val
    });
  };

  const resetDay=(date)=>{
    const copy={...hours};
    delete copy[date];
    setHours(copy);
  };

  const resetAll=()=>{
    setHours({});
  };

  const dayName=(date)=>{
    return ["일","월","화","수","목","금","토"][
      new Date(year,month,date).getDay()
    ];
  };

  return (

    <div style={{
      width:"100%",
      minHeight:"100vh",
      padding:"20px",
      boxSizing:"border-box",
      fontFamily:"sans-serif",
      fontSize:"36px"
    }}>

      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        marginBottom:20
      }}>

        <button
          onClick={prevMonth}
          style={{fontSize:30,padding:"8px 16px"}}
        >
          ◀
        </button>

        <h2>
          {year}년 {month+1}월 근무시간
        </h2>

        <button
          onClick={nextMonth}
          style={{fontSize:30,padding:"8px 16px"}}
        >
          ▶
        </button>

      </div>

      <div style={{marginBottom:30}}>
        목표 근무시간

        <input
          type="number"
          value={target}
          onChange={(e)=>setTarget(e.target.value)}
          style={{
            marginLeft:20,
            width:160,
            height:60,
            fontSize:32,
            padding:"6px 10px"
          }}
        />
      </div>

      <div style={{marginBottom:15}}>
        총 근무시간 <b>{totalWorked.toFixed(2)}</b>
      </div>

      <div style={{marginBottom:30}}>
        남은시간 <b>{remainingHours.toFixed(2)}</b>
      </div>

      <button
        onClick={resetAll}
        style={{
          marginBottom:30,
          padding:"12px 20px",
          fontSize:26
        }}
      >
        전체 초기화
      </button>

      {dates.map(date=>{

        const weekend=isWeekend(date);
        const holiday=isHoliday(date);
        const off=weekend||holiday;

        const value=hours[date]||"";

        return(

          <div
            key={date}
            style={{
              border:"1px solid #eee",
              borderRadius:16,
              padding:"20px",
              marginBottom:16,
              background: off ? "#f4f4f4":"white",
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between"
            }}
          >

            <div>

              <div style={{
                fontWeight:600,
                fontSize:32
              }}>
                {date}일 ({dayName(date)})
              </div>

              {off && (
                <div style={{
                  fontSize:26,
                  color:"#999"
                }}>
                  휴무
                </div>
              )}

            </div>

            {!off && (

              <div style={{
                display:"flex",
                alignItems:"center"
              }}>

                <input
                  type="text"
                  value={value}
                  placeholder={
                    dynamicDailyTarget
                      ? formatTime(dynamicDailyTarget)
                      : ""
                  }
                  onChange={(e)=>handleChange(date,e.target.value)}
                  style={{
                    width:140,
                    height:60,
                    padding:"8px",
                    fontSize:30,
                    borderRadius:8,
                    border:"1px solid #ccc",
                    color:value ? "#2563eb":"black"
                  }}
                />

                <button
                  onClick={()=>resetDay(date)}
                  style={{
                    marginLeft:12,
                    fontSize:24,
                    padding:"8px 12px"
                  }}
                >
                  초기화
                </button>

              </div>

            )}

          </div>

        );
      })}

    </div>
  );
}
