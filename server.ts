import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini client (accessed server-side only)
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

app.use(express.json());

// API: Counsel endpoint using Gemini API
app.post("/api/ai-analysis", async (req, res) => {
  try {
    const { audiogram, tinnitus, thiAnswers, thiScore, name, age, gender } = req.body;

    if (!ai) {
      return res.status(503).json({ 
        error: "未检测到有效的 Gemini API Key。请在系统的『设置 - 密钥』中配置。" 
      });
    }

    // Build standard clinical presentation format
    const leftEarStr = Object.entries(audiogram.left || {})
      .map(([f, val]) => `${f}Hz: ${val}dB`)
      .join(", ");
    const rightEarStr = Object.entries(audiogram.right || {})
      .map(([f, val]) => `${f}Hz: ${val}dB`)
      .join(", ");

    // Calculate PTA (Pure Tone Average for 500, 1000, 2000, 4000 Hz)
    const getPTA = (earData: any) => {
      const freqs = [500, 1000, 2000, 4000];
      let sum = 0;
      let count = 0;
      freqs.forEach(f => {
        if (typeof earData[f] === 'number') {
          sum += earData[f];
          count++;
        }
      });
      return count > 0 ? (sum / count).toFixed(1) : "未测试";
    };

    const leftPTA = getPTA(audiogram.left || {});
    const rightPTA = getPTA(audiogram.right || {});

    // Tinnitus details
    const tinnitusFreq = tinnitus.matchedFrequency ? `${tinnitus.matchedFrequency} Hz` : "未进行匹配";
    const tinnitusVol = tinnitus.matchedLoudness ? `${tinnitus.matchedLoudness}% (相对)` : "未进行匹配";
    const tinnitusType = tinnitus.soundType || "未知";

    const prompt = `
你是一位资深的听力学与耳鼻喉科（ENT）临床专家。请根据以下患者的自助式听力和耳鸣测试数据，生成一份极其专业、充满人文关怀且符合世界卫生组织（WHO）标准的【听力与耳鸣临床评估报告】。

【患者基本信息】
- 姓名/代称: ${name || "匿名测试者"}
- 年龄: ${age || "未填写"} 岁
- 性别: ${gender || "未填写"}

【左右耳气导听阈测试数据 (250Hz - 8000Hz)】
- 左耳各频段听阈: ${leftEarStr} (计算所得平均言语听阈 PTA [500-4000Hz]: ${leftPTA} dB HL)
- 右耳各频段听阈: ${rightEarStr} (计算所得平均言语听阈 PTA [500-4000Hz]: ${rightPTA} dB HL)
*注：根据听力学常识，20 dB HL以内为正常听力。*

【耳鸣评估与残疾问卷 (THI)】
- 耳鸣侧: ${tinnitus.earSide === 'left' ? '左耳' : tinnitus.earSide === 'right' ? '右耳' : tinnitus.earSide === 'both' ? '双耳' : '无明显耳鸣/未测试'}
- 匹配频率: ${tinnitusFreq}
- 匹配响度: ${tinnitusVol}
- 声音波形: ${tinnitusType}
- 耳鸣残疾量表 (THI) 得分: ${thiScore} / 100 分
*THI 得分分级参考：0-16分(微弱/无明显残疾)；18-36分(轻度)；38-56分(中度)；58-76分(重度)；78-100分(极重度)*

请直接输出一篇排版极其精美、文字温暖而严谨、富含听力学科普知识的【听力与耳鸣临床解析报告】。报告应采用清晰的 Markdown 语法进行层级展示，不要带有冗余的自我称呼（如“作为一个AI”），直接写正文。

必须包含以下部分：

### 一、🩺 听力损失等级与特征剖析 (基于WHO 2021标准)
1. **等级评估**：使用 WHO 的最新定义（正常: <20dB, 轻度: 20-34dB, 中度: 35-49dB, 中重度: 50-64dB, 重度: 65-79dB, 极重度: 80-94dB, 全聋: >=95dB），对左耳和右耳分别进行明确的听力级别界定。
2. **频段曲线特点**：分析听阈在高频（4000Hz-8000Hz）与中低频（250Hz-2000Hz）的衰减模式（如：老年性耳聋典型的高频渐降曲线，或噪声性耳聋典型的4000Hz V型凹陷），说明其生理学意义。
3. **日常交流影响**：描述在该听力级别下，患者在安静环境、嘈杂环境（如餐厅、马路）和多人谈话中的言语理解能力，以及是否容易出现“听得到但听不清”的状况。

### 二、🔔 耳鸣物理属性与残疾指数 (THI) 深度解析
1. **耳鸣频率与听力损失的相关性**：探讨耳鸣频率 (${tinnitusFreq}) 是否处于患者听力受损最严重的频段，解释为什么外周听觉通路受损会导致皮层神经元过度兴奋，从而产生“代偿性耳鸣”。
2. **THI 得分影响评估**：根据 ${thiScore} 分的级别，详细分析耳鸣在日常生活中对睡眠（入睡困难/易醒）、精神（焦虑、抑郁、烦躁）、认知（注意力不集中）和社交方面的具体阻碍。
3. **耳鸣声波特性**：针对患者选定的波形（如“白噪声”、“正弦纯音”等），阐明其声学特性及掩蔽治疗的潜能。

### 三、🌿 循证医学个性化康复方案
1. **听力干预建议（WHO规范）**：
   - 若听力损失达到中度及以上（PTA >= 35dB），强烈建议前往正规医疗机构进行助听器（Hearing Aid）验配。
   - 提供科学的防噪声指导，包括：减少耳机使用、遵守 60-60 原则（音量不超过60%，单次不超过60分钟），在噪杂环境中佩戴防噪声耳塞。
2. **耳鸣声再训练疗法 (TRT) 与声掩蔽**：
   - 教授声疗的核心技巧：使用类似自然界的声音（如雨声、海浪声或本系统提供的测试声波），音量调至刚刚好“部分掩蔽”耳鸣，即“混音点（Mixing Point）”。
   - 绝对不要在极度安静的环境里待着，可以使用背景音乐或白噪声丰富环境声，打破大脑对耳鸣的过度聚焦。
3. **认知行为调适与生活作息**：
   - 介绍“去敏感化”概念：耳鸣本身不伤身体，焦虑情绪会反向激活大脑警戒中枢，放大耳鸣。
   - 具体的物理和生活调整：避免过度摄入盐分（可影响内耳循环）、咖啡因、烟酒；保持规律作息，通过渐进式肌肉放松（PMR）或腹式呼吸改善植物神经紊乱。

### 四、🚨 红线危险症状与就诊建议
1. **急诊医学红线**：
   - 告知患者：如果出现单侧突然发生的听力断崖式下降（突发性耳聋，72小时内是黄金治疗期！）；
   - 或耳鸣伴有一侧肢体无力、天旋地转、视物重影、面瘫；
   - 或伴有耳痛、流脓、单侧耳鸣持续呈搏动性（如心脏跳动般的呼呼声，需排查血管源性疾病）。
   - 一旦有以上症状，**必须立即挂耳鼻喉科急诊！**
2. **免责声明**：强调本软件属于自助评估，结果仅供筛查与康复参考，不可作为最终医学诊断书。建议前往医院听力科进行标准隔音室纯音测听（PTA）、声阻抗、耳声发射（OAE）等全面检查。

请以极其慈爱、包容、理性的神态进行心理疏导，消除患者因耳鸣导致的“灾难化思维”（Catastrophic Thinking），帮助他们重拾耳鸣适应（Habituation）的信心。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ 
      error: "AI 报告生成失败，请稍后重试。",
      details: err.message 
    });
  }
});

// Vite middleware for dev or Static serve for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
