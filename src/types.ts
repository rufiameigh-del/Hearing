export type Frequency = 250 | 500 | 1000 | 2000 | 4000 | 6000 | 8000;

export const FREQUENCIES: Frequency[] = [250, 500, 1000, 2000, 4000, 6000, 8000];

export type EarChannel = "left" | "right";

export interface EarTestData {
  [key: number]: number; // frequency -> threshold (dB HL)
}

export interface AudiogramData {
  left: EarTestData;
  right: EarTestData;
}

export type TinnitusSoundType = "sine" | "white" | "pink" | "narrow";

export interface TinnitusData {
  earSide: "left" | "right" | "both" | "none";
  matchedFrequency: number;
  matchedLoudness: number; // 0 to 100 relative
  soundType: TinnitusSoundType;
}

export interface PatientInfo {
  name: string;
  age: string;
  gender: string;
}

export interface CalibrationSettings {
  deviceName: string;
  deviceType: "in-ear" | "over-ear" | "speaker";
  multiplier: number; // gain multiplier (e.g., 0.5 to 2.0)
  calibratedAt: string;
}

export interface TestRecord {
  id: string;
  date: string;
  type: "hearing" | "tinnitus" | "both";
  audiogram: AudiogramData;
  tinnitus: TinnitusData;
  thiAnswers?: { [key: number]: number };
  thiScore?: number;
  aiReport?: string;
  ptaLeft: number | null;
  ptaRight: number | null;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: string;
  gender: string;
  createdAt: string;
  calibration?: CalibrationSettings;
  testHistory: TestRecord[];
}

export interface UserAccount {
  id: string;
  username: string;
  passcode: string; // 4-digit PIN or password
  createdAt: string;
  profiles: PatientProfile[];
  activeProfileId: string;
}

export interface WHOSeverity {
  grade: string;
  minDb: number;
  maxDb: number;
  description: string;
  recommendation: string;
  color: string;
  dailyImpact: string[]; // detailed daily life scenarios
  typicalAudiogramLeft: { [key: number]: number }; // typical curve for visualization
  typicalAudiogramRight: { [key: number]: number };
}

// WHO 2021 standards
export function getWHOSeverity(pta: number): WHOSeverity {
  if (pta < 20) {
    return {
      grade: "听力正常",
      minDb: -10,
      maxDb: 19,
      description: "您没有明显的听力损失，能够轻松听清日常的悄悄话和远处的细微声音。",
      recommendation: "保持健康的生活习惯。减少耳机使用，避免长时间处于噪声环境。每年进行一次常规听力筛查。",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      dailyImpact: [
        "安静日常交流：在正常安静或多人的吵闹环境中，您能不费力地精准理解所有对话细节，无需重复。",
        "细小声响捕捉：可以毫不吃力地听清微风拂树、钟表秒针、远处的悄悄私语及图书馆等安静空间内的极细声音。",
        "完美的立体声定位：左右耳阈值极为均衡，大脑的声源空间定位机制非常健全，能瞬时判定声源来向。"
      ],
      typicalAudiogramLeft: { 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 10, 6000: 15, 8000: 10 },
      typicalAudiogramRight: { 250: 15, 500: 10, 1000: 15, 2000: 10, 4000: 15, 6000: 10, 8000: 15 }
    };
  } else if (pta < 35) {
    return {
      grade: "轻度听力损失",
      minDb: 20,
      maxDb: 34,
      description: "在安静的环境中交流无明显困难。但在嘈杂的环境中（如热闹餐厅、马路边、多人讨论），可能会觉得听得有些吃力，有时需要对方重复。",
      recommendation: "注意保护残余听力。在吵闹的场所配戴降噪耳塞。与人交谈时尽量面对面，在光线充足的地方，可借助口型理解。建议每半年进行听力复查。",
      color: "text-sky-600 bg-sky-50 border-sky-200",
      dailyImpact: [
        "远距离及悄悄话障碍：在超过 2 米或低分贝轻声细语中，开始觉得声音发虚、细节遗漏、有时会错意。",
        "嘈杂背景环境困难：在喧闹餐厅、车水马龙的街头进行多方交谈时，需要花费额外的神经精力才能听清言语内容。",
        "特定高频声遗漏：对一些清脆的铃声、小鸟叫声、或部分汉语拼音声母辅音（如 s、c、ch、x）的辨别度略微降低。"
      ],
      typicalAudiogramLeft: { 250: 20, 500: 25, 1000: 25, 2000: 30, 4000: 35, 6000: 40, 8000: 35 },
      typicalAudiogramRight: { 250: 20, 500: 20, 1000: 25, 2000: 25, 4000: 30, 6000: 35, 8000: 40 }
    };
  } else if (pta < 50) {
    return {
      grade: "中度听力损失",
      minDb: 35,
      maxDb: 49,
      description: "正常音量的日常交流（1米以内）会感觉明显的吃力，经常需要对方提高嗓门或重复说话。容易出现“听得到声音但听不清内容”的状况。",
      recommendation: "WHO标准推荐：此阶段已对社会生活产生较大影响。建议前往正规听力中心配戴助听器（Hearing Aids），以避免长期大脑缺乏声刺激导致言语识别率退化。辅以交流策略训练。",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      dailyImpact: [
        "日常面对面受限：在约 1 米的常规交流下，常常感觉对白发闷，需要谈话对象调大声音、说慢点或频繁打手势。",
        "电视音量偏大：由于丢失大量声能，看电视或听广播时需大幅调高音量，从而导致同住的其他亲属感觉刺耳难耐。",
        "社交疲惫与隔阂：因为时常听错、误读而不得不赔笑或保持沉默，进而产生挫败、焦虑甚至逃避群体交往的消极行为。"
      ],
      typicalAudiogramLeft: { 250: 35, 500: 40, 1000: 45, 2000: 45, 4000: 50, 6000: 55, 8000: 50 },
      typicalAudiogramRight: { 250: 30, 500: 35, 1000: 40, 2000: 45, 4000: 50, 6000: 50, 8000: 45 }
    };
  } else if (pta < 65) {
    return {
      grade: "中重度听力损失",
      minDb: 50,
      maxDb: 64,
      description: "正常的面对面日常谈话已经无法顺畅进行，除非对方大声喊叫或距离非常近。在群体谈话或有环境背景声时极其困难。",
      recommendation: "强烈推荐尽早双耳验配优质助听器。日常可配合无线调频（FM）等助听辅助系统。进行听觉言语康复训练，保持积极的社交生活，预防由于听力障碍带来的社会孤立感。",
      color: "text-orange-600 bg-orange-50 border-orange-200",
      dailyImpact: [
        "高难度大声喊叫：近距离（0.5米以内）聊天时，对方必须特意扯开嗓门或大声吆喝，否则您完全无法理解词义。",
        "言语分辨力极度崩塌：对没有看到口型的纯声音基本无从理解，在有风扇或道路喧嚣的嘈杂空间中言语丧失感极强。",
        "严重的道路安全隐患：无法察觉后方逼近的自行车或轻微的汽车胎噪、倒车雷达等安全提示声音，在户外走动有危险。"
      ],
      typicalAudiogramLeft: { 250: 50, 500: 55, 1000: 55, 2000: 60, 4000: 65, 6000: 70, 8000: 65 },
      typicalAudiogramRight: { 250: 45, 500: 50, 1000: 55, 2000: 60, 4000: 60, 6000: 65, 8000: 60 }
    };
  } else if (pta < 80) {
    return {
      grade: "重度听力损失",
      minDb: 65,
      maxDb: 79,
      description: "无法听清正常的谈话声。只能够听到近距离的大声喊叫、汽车喇叭或重击声等强噪声。日常沟通高度依赖口型或书写。",
      recommendation: "应立即前往三甲医院耳鼻喉科就诊，开展耳聋原因筛查。必须验配大功率或超大功率助听器。若助听器补偿效果不佳，应在医生指导下评估人工耳蜗（Cochlear Implant）植入手术。",
      color: "text-rose-600 bg-rose-50 border-rose-200",
      dailyImpact: [
        "无言语沟通可能：普通的交谈、甚至很大音量的喊门完全听不到，日常交流基本转为书写、严重依赖唇读或手势语。",
        "纯高强度噪音敏感：仅有极其响亮、极具破坏性的环境突发音（如重卡长鸣笛、建筑地基钻击、近在咫尺的震耳春雷）才会引发微弱的音感。",
        "基本环境音丧失：生活中的自然白噪声、下雨滴水声、风扇和微波炉蜂鸣全部听不到，对声音的距离感判断力归零。"
      ],
      typicalAudiogramLeft: { 250: 65, 500: 70, 1000: 75, 2000: 75, 4000: 80, 6000: 85, 8000: 80 },
      typicalAudiogramRight: { 250: 60, 500: 65, 1000: 70, 2000: 75, 4000: 75, 6000: 80, 8000: 75 }
    };
  } else if (pta < 95) {
    return {
      grade: "极重度听力损失",
      minDb: 80,
      maxDb: 94,
      description: "对外界极响的声音（如飞机起飞、重型卡车、鸣笛声）可能也只能听到一部分，基本失去了言语交流能力。",
      recommendation: "强烈建议进行人工耳蜗植入手术评估，这是重建极重度听力损失患者听觉言语功能最有效的方式。同时可学习手语或视觉辅助交流，保持心理健康。",
      color: "text-red-700 bg-red-50 border-red-200",
      dailyImpact: [
        "助听下依然迷茫：即便双耳验配了顶配的大功率助听器，日常若不看口型和手语，仍然无法通过聆听开展正常沟通。",
        "骨传导与触觉替代：几乎感受不到声音的震颤，唯独依靠极强的超重低音声压、爆破声拍打在身上的物理振动来感受节奏。",
        "社会绝缘与压抑：日常获取信息的通道高度受限，有严重的孤独、自闭和自我边缘化情绪风险，需进行康复介入。"
      ],
      typicalAudiogramLeft: { 250: 80, 500: 85, 1000: 90, 2000: 90, 4000: 95, 6000: 95, 8000: 90 },
      typicalAudiogramRight: { 250: 80, 500: 80, 1000: 85, 2000: 90, 4000: 90, 6000: 95, 8000: 90 }
    };
  } else {
    return {
      grade: "全聋",
      minDb: 95,
      maxDb: 120,
      description: "完全听不到外界的任何声音，完全失去了听觉感知通道。",
      recommendation: "医学影像学和内耳结构评估。首选人工耳蜗植入。在日常生活中，需格外留意视觉信号（如闪光门铃、振动闹钟等安全警示装置）以保自身安全。建议配合专业康复治疗。",
      color: "text-purple-700 bg-purple-50 border-purple-200",
      dailyImpact: [
        "物理级静音黑洞：完全听不见现实世界的任何声音分贝，无论是打雷还是大炮轰鸣，听觉神经电信号均无法向大脑传导。",
        "极端危险的环境状况：无法从声音层面听到火灾警报、汽笛刹车、倒车警示，日常需要打起极高的精神关注视觉指示牌。",
        "完全转向非听觉载体：日常完全转为使用震动闹钟、闪光可视门铃、文字识别投屏、手语以及人工交互辅助工具。"
      ],
      typicalAudiogramLeft: { 250: 100, 500: 105, 1000: 110, 2000: 110, 4000: 115, 6000: 120, 8000: 120 },
      typicalAudiogramRight: { 250: 100, 500: 100, 1000: 105, 2000: 110, 4000: 110, 6000: 115, 8000: 115 }
    };
  }
}
