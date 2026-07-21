import React, { useState, useEffect, useRef } from "react";
import { getWHOSeverity, FREQUENCIES, WHOSeverity } from "../types";
import { BookOpen, ShieldAlert, Sparkles, Volume2, Square, Headphones, Info, CheckCircle } from "lucide-react";

export default function WhoLibrary() {
  const [selectedPta, setSelectedPta] = useState<number>(10); // Default to normal
  const severity = getWHOSeverity(selectedPta);

  // Muffled sound simulator states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<OscillatorNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lowpassFilterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, []);

  const startSimulation = () => {
    try {
      stopSimulation();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // We synthesize a rich sound: a low drone + mid melody + high pitch hiss (representing consonants s, f, etc.)
      // This will demonstrate the loss of high-frequencies vividly.
      const oscDrone = ctx.createOscillator();
      const oscMelody = ctx.createOscillator();
      
      oscDrone.type = "sawtooth";
      oscDrone.frequency.setValueAtTime(110, ctx.currentTime); // Low A

      oscMelody.type = "triangle";
      oscMelody.frequency.setValueAtTime(440, ctx.currentTime); // Mid A
      // Add a simple rhythmic melody pitch change
      oscMelody.frequency.setValueAtTime(440, ctx.currentTime);
      oscMelody.frequency.setValueAtTime(554.37, ctx.currentTime + 0.8); // C#
      oscMelody.frequency.setValueAtTime(659.25, ctx.currentTime + 1.6); // E
      oscMelody.frequency.setValueAtTime(880, ctx.currentTime + 2.4); // High A

      // Generate soft white noise to act as high-frequency consonants
      const bufferSize = ctx.sampleRate * 4; // 4 seconds loop
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Filter noise to high-pass (consonants)
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setValueAtTime(3000, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.015, ctx.currentTime);

      // Mixer gain
      const mixGain = ctx.createGain();
      mixGain.gain.setValueAtTime(0.04, ctx.currentTime);

      // Biquad filter to simulate hearing loss attenuation
      const simulationFilter = ctx.createBiquadFilter();
      simulationFilter.type = "lowpass";

      // Apply lowpass cutoff frequencies based on selected hearing loss level
      // Normal <20, Mild <35, Moderate <50, Severe <65, Profound <80, Extreme <95
      if (selectedPta < 20) {
        simulationFilter.frequency.setValueAtTime(20000, ctx.currentTime); // Normal (unfiltered)
        mixGain.gain.setValueAtTime(0.05, ctx.currentTime);
      } else if (selectedPta < 35) {
        simulationFilter.frequency.setValueAtTime(4000, ctx.currentTime); // Mild high-freq loss
        mixGain.gain.setValueAtTime(0.04, ctx.currentTime);
      } else if (selectedPta < 50) {
        simulationFilter.frequency.setValueAtTime(2000, ctx.currentTime); // Moderate loss
        mixGain.gain.setValueAtTime(0.025, ctx.currentTime);
      } else if (selectedPta < 65) {
        simulationFilter.frequency.setValueAtTime(1000, ctx.currentTime); // Mid-severe loss
        mixGain.gain.setValueAtTime(0.015, ctx.currentTime);
      } else if (selectedPta < 80) {
        simulationFilter.frequency.setValueAtTime(400, ctx.currentTime); // Severe loss
        mixGain.gain.setValueAtTime(0.006, ctx.currentTime);
      } else if (selectedPta < 95) {
        simulationFilter.frequency.setValueAtTime(150, ctx.currentTime); // Profound loss
        mixGain.gain.setValueAtTime(0.0015, ctx.currentTime);
      } else {
        simulationFilter.frequency.setValueAtTime(20, ctx.currentTime); // Deaf (silent)
        mixGain.gain.setValueAtTime(0.0, ctx.currentTime);
      }

      // Connect standard oscillators
      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.3, ctx.currentTime);
      oscDrone.connect(droneGain);
      droneGain.connect(mixGain);

      const melodyGain = ctx.createGain();
      melodyGain.gain.setValueAtTime(0.4, ctx.currentTime);
      oscMelody.connect(melodyGain);
      melodyGain.connect(mixGain);

      // Connect noise path
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(mixGain);

      // Routing to simulator filter
      mixGain.connect(simulationFilter);
      simulationFilter.connect(ctx.destination);

      // Play
      oscDrone.start();
      oscMelody.start();
      noise.start();

      sourceRef.current = oscMelody; // Just keep melody ref to stop (we stop context or disconnect mix anyway)
      noiseSourceRef.current = noise;
      gainNodeRef.current = mixGain;
      lowpassFilterRef.current = simulationFilter;
      setIsPlaying(true);
    } catch (err) {
      console.error("Failed to start sound simulation:", err);
    }
  };

  const stopSimulation = () => {
    try {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (lowpassFilterRef.current) {
        lowpassFilterRef.current.disconnect();
        lowpassFilterRef.current = null;
      }
      setIsPlaying(false);
    } catch (e) {
      // Ignored
    }
  };

  // Adjust simulation if selectedPta changes while playing
  useEffect(() => {
    if (isPlaying && lowpassFilterRef.current && gainNodeRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (selectedPta < 20) {
        lowpassFilterRef.current.frequency.setValueAtTime(20000, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.05, ctx.currentTime);
      } else if (selectedPta < 35) {
        lowpassFilterRef.current.frequency.setValueAtTime(4000, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.04, ctx.currentTime);
      } else if (selectedPta < 50) {
        lowpassFilterRef.current.frequency.setValueAtTime(2000, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.025, ctx.currentTime);
      } else if (selectedPta < 65) {
        lowpassFilterRef.current.frequency.setValueAtTime(1000, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.015, ctx.currentTime);
      } else if (selectedPta < 80) {
        lowpassFilterRef.current.frequency.setValueAtTime(400, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.006, ctx.currentTime);
      } else if (selectedPta < 95) {
        lowpassFilterRef.current.frequency.setValueAtTime(150, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.0015, ctx.currentTime);
      } else {
        lowpassFilterRef.current.frequency.setValueAtTime(20, ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.0, ctx.currentTime);
      }
    }
  }, [selectedPta, isPlaying]);

  // Audio representative frequencies
  const chartFreqs = [250, 500, 1000, 2000, 4000, 6000, 8000];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in" id="who-library-dashboard">
      
      {/* Left Column: Grade Selector buttons */}
      <div className="lg:col-span-4 space-y-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          WHO 听力评估等级划分 (2021 版)
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
          世界卫生组织根据纯音平均听阈 (PTA, 涵盖 0.5kHz, 1kHz, 2kHz, 4kHz 平均) 将听功能障碍划分为以下等级：
        </p>

        <div className="space-y-2">
          {[
            { label: "听力正常 (< 20 dB)", pta: 10 },
            { label: "轻度听力损失 (20 - 34 dB)", pta: 28 },
            { label: "中度听力损失 (35 - 49 dB)", pta: 42 },
            { label: "中重度听力损失 (50 - 64 dB)", pta: 58 },
            { label: "重度听力损失 (65 - 79 dB)", pta: 72 },
            { label: "极重度听力损失 (80 - 94 dB)", pta: 88 },
            { label: "全聋 (≥ 95 dB)", pta: 110 },
          ].map((item) => {
            const isSelected = getWHOSeverity(item.pta).grade === severity.grade;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelectedPta(item.pta)}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl text-left transition border ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Detailed encyclopedic view card */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Title Banner */}
        <div className={`p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
          <div>
            <span className={`inline-flex px-3 py-1 text-xs font-black rounded-full border border-slate-200/50 ${severity.color}`}>
              {severity.grade} ({severity.minDb} ~ {severity.maxDb} dB HL)
            </span>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {severity.description}
            </p>
          </div>
          
          {/* Audio Muffled Simulator */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between items-center w-full sm:w-48 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-indigo-500" />
              听觉受损模拟试听
            </span>
            <button
              onClick={isPlaying ? stopSimulation : startSimulation}
              className={`w-full py-2 mt-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                isPlaying
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3 h-3 fill-white" /> Stop
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" /> 试听模拟音
                </>
              )}
            </button>
            <span className="text-[9px] text-slate-400 mt-1.5 text-center">
              {isPlaying ? "体验高频元音和背景声衰减" : "通过算法衰减特定音高声能"}
            </span>
          </div>
        </div>

        {/* Dynamic visual details and typical audiogram */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Visual typical audiogram */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">
              典型测听曲线 (Typical Audiogram Sample):
            </span>
            
            {/* SVG mini audiogram */}
            <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 relative h-64 shadow-inner">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                {/* Horizontal reference lines for dB */}
                {[0, 20, 40, 60, 80, 100, 120].map((db) => {
                  const y = ((db + 10) / 130) * 100;
                  return (
                    <g key={db}>
                      <line
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke={db === 20 ? "#10b981" : "#e2e8f0"}
                        strokeWidth={db === 20 ? "0.8" : "0.3"}
                        strokeDasharray={db === 20 ? "" : "2 2"}
                      />
                      <text x="2" y={y - 1} fill="#94a3b8" fontSize="3" fontStyle={db === 20 ? "bold" : ""}>
                        {db} dB{db === 20 ? " (正常分界)" : ""}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical reference lines for Freqs */}
                {chartFreqs.map((f, idx) => {
                  const x = 12 + idx * 13;
                  return (
                    <g key={f}>
                      <line
                        x1={x}
                        y1="0"
                        x2={x}
                        y2="100"
                        stroke="#e2e8f0"
                        strokeWidth="0.3"
                      />
                      <text x={x} y="98" fill="#94a3b8" fontSize="2.8" textAnchor="middle">
                        {f >= 1000 ? `${f / 1000}k` : f}Hz
                      </text>
                    </g>
                  );
                })}

                {/* Plot LEFT Ear (Blue circles) */}
                <path
                  d={chartFreqs.map((f, idx) => {
                    const x = 12 + idx * 13;
                    const db = severity.typicalAudiogramLeft[f];
                    const y = ((db + 10) / 130) * 100;
                    return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.2"
                />
                {chartFreqs.map((f, idx) => {
                  const x = 12 + idx * 13;
                  const db = severity.typicalAudiogramLeft[f];
                  const y = ((db + 10) / 130) * 100;
                  return (
                    <circle
                      key={f}
                      cx={x}
                      cy={y}
                      r="1.8"
                      fill="#ffffff"
                      stroke="#3b82f6"
                      strokeWidth="0.8"
                    />
                  );
                })}

                {/* Plot RIGHT Ear (Red Crosses) */}
                <path
                  d={chartFreqs.map((f, idx) => {
                    const x = 12 + idx * 13;
                    const db = severity.typicalAudiogramRight[f];
                    const y = ((db + 10) / 130) * 100;
                    return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                />
                {chartFreqs.map((f, idx) => {
                  const x = 12 + idx * 13;
                  const db = severity.typicalAudiogramRight[f];
                  const y = ((db + 10) / 130) * 100;
                  return (
                    <g key={f}>
                      <line x1={x - 1.2} y1={y - 1.2} x2={x + 1.2} y2={y + 1.2} stroke="#ef4444" strokeWidth="0.8" />
                      <line x1={x + 1.2} y1={y - 1.2} x2={x - 1.2} y2={y + 1.2} stroke="#ef4444" strokeWidth="0.8" />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-1">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-white"></span>左耳 L 典型</span>
              <span className="flex items-center gap-1"><span className="text-red-500 font-extrabold text-[11px] leading-none">×</span>右耳 R 典型</span>
            </div>
          </div>

          {/* Clinical explanations & daily impacts */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                📋 日常生活具体阻碍 (Impact on Daily Life Scenarios):
              </span>
              <div className="space-y-2">
                {severity.dailyImpact.map((text, index) => (
                  <div key={index} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed flex gap-2.5">
                    <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      0{index + 1}
                    </span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                临床医学推荐临床行动干预 (WHO Guideline Action):
              </span>
              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/40 border border-amber-100 rounded-xl p-4">
                {severity.recommendation}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
