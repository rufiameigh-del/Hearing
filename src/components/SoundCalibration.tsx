import React, { useState, useEffect, useRef } from "react";
import { Headphones, Volume2, ShieldAlert, CheckCircle, Info, Sparkles, Sliders, Play, Square, RefreshCw } from "lucide-react";
import { CalibrationSettings } from "../types";

interface SoundCalibrationProps {
  onComplete: (settings: CalibrationSettings) => void;
  onCancel: () => void;
  initialSettings?: CalibrationSettings;
}

export default function SoundCalibration({ onComplete, onCancel, initialSettings }: SoundCalibrationProps) {
  const [step, setStep] = useState<number>(1);
  const [deviceType, setDeviceType] = useState<"in-ear" | "over-ear" | "speaker">(
    initialSettings?.deviceType || "in-ear"
  );
  const [deviceName, setDeviceName] = useState<string>(initialSettings?.deviceName || "");
  const [multiplier, setMultiplier] = useState<number>(initialSettings?.multiplier || 1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playingType, setPlayingType] = useState<"pure" | "noise" | null>(null);

  // Web Audio Context for calibration
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscNodeRef = useRef<OscillatorNode | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Set default multiplier based on device selection
  const handleDeviceSelect = (type: "in-ear" | "over-ear" | "speaker") => {
    setDeviceType(type);
    if (type === "in-ear") {
      setMultiplier(0.75); // In-ears are very close to eardrum, reduce gain
      if (!deviceName) setDeviceName("入耳式耳机 (AirPods/有线耳塞)");
    } else if (type === "over-ear") {
      setMultiplier(1.0); // Baseline reference
      if (!deviceName) setDeviceName("头戴式耳机 (罩耳式大耳机)");
    } else {
      setMultiplier(1.6); // Speakers lose energy in open air, boost gain
      if (!deviceName) setDeviceName("内置/外接扬声器");
    }
  };

  const startAudio = (type: "pure" | "noise") => {
    try {
      stopAudio();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const gain = ctx.createGain();
      
      // Calculate calibration-scaled test volume
      const baseGain = type === "pure" ? 0.05 : 0.03;
      gain.gain.setValueAtTime(baseGain * multiplier, ctx.currentTime);

      if (type === "pure") {
        // Play 1000 Hz pure tone
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        oscNodeRef.current = osc;
      } else {
        // Play simulated band-passed hand-rubbing noise (White noise with BiquadFilter)
        // Since AudioWorklet can be complex in generic template, we use standard ScriptProcessor for white noise
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Bandpass filter centered around 1500Hz to match hand rub frequency distribution
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1500, ctx.currentTime);
        filter.Q.setValueAtTime(1.0, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gain);
        whiteNoise.start();

        // Save reference to stop
        (whiteNoise as any).gainNode = gain;
        noiseNodeRef.current = whiteNoise as any;
      }

      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
      setIsPlaying(true);
      setPlayingType(type);
    } catch (err) {
      console.error("Failed to start calibration sound:", err);
    }
  };

  const stopAudio = () => {
    try {
      if (oscNodeRef.current) {
        oscNodeRef.current.stop();
        oscNodeRef.current.disconnect();
        oscNodeRef.current = null;
      }
      if (noiseNodeRef.current) {
        (noiseNodeRef.current as any).stop();
        (noiseNodeRef.current as any).disconnect();
        noiseNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      setIsPlaying(false);
      setPlayingType(null);
    } catch (e) {
      // Ignored
    }
  };

  // Live adjustment of multiplier
  const handleMultiplierChange = (val: number) => {
    setMultiplier(val);
    if (isPlaying && gainNodeRef.current && audioCtxRef.current) {
      const baseGain = playingType === "pure" ? 0.05 : 0.03;
      gainNodeRef.current.gain.setValueAtTime(baseGain * val, audioCtxRef.current.currentTime);
    }
  };

  const handleFinish = () => {
    stopAudio();
    onComplete({
      deviceName: deviceName.trim() || `${deviceType === "in-ear" ? "入耳式" : deviceType === "over-ear" ? "头戴式" : "扬声器"}设备`,
      deviceType,
      multiplier,
      calibratedAt: new Date().toISOString(),
    });
  };

  return (
    <div id="sound-calibration-card" className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-fade-in">
      {/* Wizard Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white p-6 relative">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-200 animate-pulse" />
          临床级声学音量校准向导
        </h3>
        <p className="text-indigo-100 text-xs mt-1">
          因为每款耳机、扬声器驱动功率不同，我们需要通过校准来消除物理设备差异，保证测得的听阈（dB HL）尽量准确。
        </p>
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-between mt-6 max-w-md mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                  step === s
                    ? "bg-white text-indigo-700 border-white shadow-md ring-4 ring-indigo-500/30Scale"
                    : step > s
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-indigo-800 text-indigo-300 border-indigo-700"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${
                    step > s ? "bg-emerald-500" : "bg-indigo-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-indigo-200 mt-2 font-semibold">
          <span className="w-24 text-center">1. 选择耳机设备</span>
          <span className="w-24 text-center">2. 系统音量定位</span>
          <span className="w-24 text-center">3. 掌擦音量平衡</span>
        </div>
      </div>

      {/* Steps Content */}
      <div className="p-6 md:p-8 space-y-6 min-h-[320px] flex flex-col justify-between">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in" id="calib-step-1">
            <h4 className="text-base font-bold text-slate-800">步骤 1: 选择您的测试音频设备</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              请根据您目前佩戴的设备类型进行选择。系统会载入针对该类设备的预设初始声学增益系数。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeviceSelect("in-ear")}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-36 ${
                  deviceType === "in-ear"
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`p-2 rounded-lg ${deviceType === "in-ear" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Headphones className="w-5 h-5" />
                  </span>
                  {deviceType === "in-ear" && <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">已选</span>}
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">入耳式耳机 / 耳塞</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">AirPods、手机配赠有线耳塞。灵敏度高，贴近耳道。</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDeviceSelect("over-ear")}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-36 ${
                  deviceType === "over-ear"
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`p-2 rounded-lg ${deviceType === "over-ear" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Headphones className="w-5 h-5 stroke-[2.5]" />
                  </span>
                  {deviceType === "over-ear" && <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">已选</span>}
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">头戴罩耳式耳机</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">大耳罩式、电竞耳麦、监听大耳机。密封好，隔离度强。</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDeviceSelect("speaker")}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-36 ${
                  deviceType === "speaker"
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`p-2 rounded-lg ${deviceType === "speaker" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Volume2 className="w-5 h-5" />
                  </span>
                  {deviceType === "speaker" && <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">已选</span>}
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">内置/外接扬声器</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">笔记本内置音响或桌面低音炮。极易受环境音干扰。</p>
                </div>
              </button>
            </div>

            {deviceType === "speaker" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-[11px] flex gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  <strong>特别提醒：</strong>纯音听阈测试强烈推荐戴立体声耳机进行。使用扬声器测试时，无法完全分辨左右耳独立听力，且室内回音和底噪会使测得的 dB HL 存在极大的临床偏差。
                </p>
              </div>
            )}

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">
                选填：为此设备起个名字
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="例如：AirPods Pro / 我的索尼大耳机"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in" id="calib-step-2">
            <h4 className="text-base font-bold text-slate-800 font-sans">步骤 2: 定位系统与物理总音量</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              我们需要在系统端设定一个适中的物理基准线，以此基准点进行软件细微校准。
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <p className="text-xs text-slate-600 leading-normal">
                  请打开您的<strong>操作系统音量控制</strong>（如 Windows 的右下角喇叭图标或 Mac 顶部的音量条），将其调至 <strong>50% - 60%</strong> 的中等位置。
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <div className="text-xs text-slate-600 leading-normal flex-1">
                  <span>点击下方按钮试听 1000Hz 参考标准音：</span>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => (isPlaying && playingType === "pure" ? stopAudio() : startAudio("pure"))}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-sm ${
                        isPlaying && playingType === "pure"
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      {isPlaying && playingType === "pure" ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          停止标准音
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          播放标准音 (1000Hz)
                        </>
                      )}
                    </button>
                    {isPlaying && playingType === "pure" && (
                      <span className="text-[11px] text-emerald-600 font-medium animate-pulse">
                        音频播放中，请调整系统总音量...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-200 pt-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <p className="text-xs text-slate-600 leading-normal">
                  标准音的响度在 50% 系统音量下，应该呈现为<strong>温和、清晰但不刺耳的嘀声</strong>。调整好后，请务必<strong>保持此系统总音量在后续整个测试中不再变动</strong>。
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in" id="calib-step-3">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-slate-800">步骤 3: 掌擦音量生物校准 (Biological Hand-Rub)</h4>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> 高精推荐
              </span>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              这是一种无专业测声计（Decibel Meter）时<strong>最精准、受认可的耳科生物校准法</strong>。
            </p>

            {/* Instruction Step block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 bg-indigo-50/30 p-4 rounded-xl space-y-3 text-xs text-slate-600">
                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-1.5 h-3 rounded bg-indigo-600"></span>
                  第一步：摩擦手掌听响
                </h5>
                <p className="leading-relaxed">
                  请摘下一边耳机。伸出您的手掌，在离耳朵约 <strong>2 厘米</strong> 处，用均匀的力度<strong>快速相互揉搓手掌</strong>。
                </p>
                <p className="text-slate-400">
                  此时您所听到的沙沙风吹声，在物理声学中其响度约为 <strong>35 - 40 dBA</strong>。请在脑海中记住这个微弱粗糙的响度。
                </p>
              </div>

              <div className="border border-slate-200 bg-indigo-50/30 p-4 rounded-xl space-y-3 text-xs text-slate-600">
                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-1.5 h-3 rounded bg-indigo-600"></span>
                  第二步：调节滑块对齐
                </h5>
                <p className="leading-relaxed">
                  戴回耳机，点击播放下方<strong>校准噪音</strong>。它发出类似的模拟沙沙声。
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => (isPlaying && playingType === "noise" ? stopAudio() : startAudio("noise"))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                      isPlaying && playingType === "noise"
                        ? "bg-red-500 text-white"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {isPlaying && playingType === "noise" ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                    {isPlaying && playingType === "noise" ? "停止校准噪音" : "播放校准噪音"}
                  </button>
                </div>
                <p className="text-slate-400 mt-1">
                  请左右滑动下方微调器，直到<strong>耳机沙沙声和您刚才手掌摩擦声音的响度基本吻合</strong>。
                </p>
              </div>
            </div>

            {/* Calibration Factor Slider */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  软件增益微调系数 (Calibration Factor):
                </span>
                <span className="text-base font-mono font-bold text-indigo-700">
                  x{multiplier.toFixed(2)}
                </span>
              </div>

              <input
                type="range"
                min="0.30"
                max="2.50"
                step="0.05"
                value={multiplier}
                onChange={(e) => handleMultiplierChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.30 (高敏耳塞调小)</span>
                <span>1.00 (标准基准)</span>
                <span>2.50 (弱阻抗大耳机放大)</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-4">
          <button
            type="button"
            onClick={() => {
              stopAudio();
              if (step > 1) {
                setStep(step - 1);
              } else {
                onCancel();
              }
            }}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
          >
            {step === 1 ? "取消并返回" : "返回上一步"}
          </button>

          <div className="flex items-center gap-2">
            {step === 3 && (
              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  setMultiplier(deviceType === "in-ear" ? 0.75 : deviceType === "over-ear" ? 1.0 : 1.6);
                  if (isPlaying) {
                    setTimeout(() => startAudio(playingType || "noise"), 50);
                  }
                }}
                className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                title="还原设备默认增益"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 重置
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                stopAudio();
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  handleFinish();
                }
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold rounded-xl text-xs transition shadow-md hover:shadow-lg flex items-center gap-1"
            >
              {step === 3 ? "完成校准并应用" : "确认，进入下一步 &rarr;"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
