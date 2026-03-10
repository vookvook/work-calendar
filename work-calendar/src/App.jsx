import React from "react";
import Calendar from "./Calendar";
...
import { useState, useMemo, useEffect } from "react";

export default function Calendar() {
  const [year] = useState(2026);
  const [month] = useState(3);

  const [targetHours, setTargetHours] = useState(169);

  const [confirmedHours, setConfirmedHours] = useState({});
  const [confirmedDays, setConfirmedDays] = useState({});

  const [selectedDate, setSelectedDate] = useState(null);

  const [inputHour, setInputHour] = useState("");
  const [inputMinute, setInputMinute] = useState("");

  const holidays = {
    "2026-03-02": true,
  };

  useEffect(() => {
    const saved = localStorage.getItem("workCalendar");

    if (saved) {
      const data = JSON.parse(saved);

      setConfirmedHours(data.confirmedHours || {});
      setConfirmedDays(data.confirmedDays || {});
      setTargetHours(data.targetHours || 169);
    }
  }, []);

  function decimalToHM(decimal) {
    if (decimal === null || decimal === undefined) return "";

    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);

    return `${h}시간 ${String(m).padStart(2, "0")}분`;
  }

  function hmToDecimal(h, m) {
    return Number(h) + Number(m) / 60;
  }

  const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

  const isWeekend = (y, m, d) => {
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
  };

  const isHoliday = (y, m, d) => {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    return holidays[key];
  };

  const isWorkday = (y, m, d) => !isWeekend(y, m, d) && !isHoliday(y, m, d);

  const distribution = useMemo(() => {
    const days = getDaysInMonth(year, month);
    const result = {};

    let confirmedTotal = 0;
    let remainDays = 0;

    for (let d = 1; d <= days; d++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      if (!isWorkday(year, month, d)) {
        result[key] = null;
        continue;
      }

      if (confirmedDays[key]) {
        result[key] = confirmedHours[key] || 0;
        confirmedTotal += confirmedHours[key] || 0;
      } else {
        remainDays++;
      }
    }

    const remain = targetHours - confirmedTotal;
    const perDay = remainDays ? remain / remainDays : 0;

    for (let d = 1; d <= days; d++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      if (!isWorkday(year, month, d)) continue;

      if (!confirmedDays[key]) {
        result[key] = Math.round(perDay * 100) / 100;
      }
    }

    return result;
  }, [confirmedHours, confirmedDays, targetHours]);

  const handleClick = (day) => {
    if (!isWorkday(year, month, day)) return;

    const key = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    setSelectedDate(key);

    const existing = confirmedHours[key];

    if (existing) {
      const h = Math.floor(existing);
      const m = Math.round((existing - h) * 60);

      setInputHour(h);
      setInputMinute(m);
    } else {
      setInputHour("");
      setInputMinute("");
    }
  };

  const saveHours = () => {
    const decimal = hmToDecimal(inputHour, inputMinute);

    const newHours = { ...confirmedHours, [selectedDate]: decimal };
    const newDays = { ...confirmedDays, [selectedDate]: true };

    setConfirmedHours(newHours);
    setConfirmedDays(newDays);

    setSelectedDate(null);
  };

  const resetDay = () => {
    const newHours = { ...confirmedHours };
    const newDays = { ...confirmedDays };

    delete newHours[selectedDate];
    delete newDays[selectedDate];

    setConfirmedHours(newHours);
    setConfirmedDays(newDays);

    setSelectedDate(null);
  };

  const saveAll = () => {
    localStorage.setItem(
      "workCalendar",
      JSON.stringify({
        confirmedHours,
        confirmedDays,
        targetHours,
      })
    );

    alert("저장 완료");
  };

  const days = getDaysInMonth(year, month);

  const first = new Date(year, month - 1, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;

  const cells = [];

  for (let i = 0; i < offset; i++) cells.push(<div key={i} />);

  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    const h = distribution[key];

    const weekend = isWeekend(year, month, d);
    const holiday = isHoliday(year, month, d);

    const confirmed = confirmedDays[key];

    cells.push(
      <div
        key={d}
        onClick={() => handleClick(d)}
        className={`border rounded p-3 min-h-24
        ${weekend ? "bg-gray-100" : ""}
        ${holiday ? "bg-red-100" : ""}
        ${isWorkday(year, month, d) ? "cursor-pointer hover:bg-blue-50" : ""}`}
      >
        <div className="font-medium">{d}</div>

        {h !== null && (
          <div
            className={`text-right text-sm
            ${confirmed ? "text-blue-600 font-semibold" : "text-black"}
          `}
          >
            {decimalToHM(h)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">
        {year}년 {month}월 근무시간
      </h1>

      <div className="mb-4 flex gap-2 items-center">
        목표 근무시간
        <input
          type="number"
          value={targetHours}
          onChange={(e) => setTargetHours(parseFloat(e.target.value))}
          className="border p-1 w-24"
        />
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center font-medium">
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div>토</div>
        <div>일</div>
      </div>

      <div className="grid grid-cols-7 gap-2">{cells}</div>

      <button
        onClick={saveAll}
        className="mt-6 px-4 py-2 bg-green-600 text-white rounded"
      >
        적용
      </button>

      {selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-80">
            <h3 className="mb-4 font-medium">근무시간 입력</h3>

            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder="시간"
                value={inputHour}
                onChange={(e) => setInputHour(e.target.value)}
                className="border p-2 w-full"
              />

              <input
                type="number"
                placeholder="분"
                value={inputMinute}
                onChange={(e) => setInputMinute(e.target.value)}
                className="border p-2 w-full"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveHours}
                className="flex-1 bg-blue-600 text-white p-2 rounded"
              >
                저장
              </button>

              <button
                onClick={resetDay}
                className="flex-1 bg-red-500 text-white p-2 rounded"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
