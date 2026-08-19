/* Design philosophy: 午夜天文台 / Scientific Instrument Aesthetic. This page is a calm digital orrery: orbit geometry is precise, controls are tactile, and the 3D system remains the visual focus. */
import { useState } from "react";
import { ArrowLeft, Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import SolarSystemThreeScene from "@/components/SolarSystemThreeScene";

export default function SolarSystem() {
  const [, navigate] = useLocation();
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [focus, setFocus] = useState("太阳系");

  return (
    <main className="solar-system-page">
      <header className="solar-system-topbar">
        <button type="button" className="solar-system-back" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回观测站</button>
        <div className="solar-system-title"><span>THREE.JS · ORBITAL MECHANICS</span><h1>太阳系运转</h1></div>
        <div className="solar-system-status"><span className={`status-dot ${running ? "" : "paused"}`} />{running ? "实时运行" : "已暂停"}</div>
      </header>
      <div className="solar-system-stage"><SolarSystemThreeScene running={running} speed={speed} onFocus={setFocus} /><div className="solar-system-caption"><span>当前聚焦</span><strong>{focus}</strong><small>拖拽旋转视角 · 滚轮缩放 · 点击行星查看</small></div></div>
      <aside className="solar-system-console">
        <div className="solar-console-kicker"><Gauge size={14} /> 太阳系 · 轨道观测</div>
        <div className="solar-console-readout"><small>SIMULATION STATE</small><strong>{running ? "运行中" : "暂停"}</strong><span>比例为示意轨道半径，行星尺寸已增强显示</span></div>
        <button type="button" className="solar-console-action" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? "暂停运转" : "继续运转"}</button>
        <div className="solar-speed"><div><span>运行速度</span><b>{speed}×</b></div><input type="range" min=".25" max="8" step=".25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></div>
        <button type="button" className="solar-reset" onClick={() => { setFocus("太阳系"); setSpeed(1); }}><RotateCcw size={14} />恢复标准速度</button>
      </aside>
    </main>
  );
}
