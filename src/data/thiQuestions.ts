export interface THIQuestion {
  id: number;
  text: string;
  category: "functional" | "emotional" | "catastrophic";
  categoryName: string;
}

export const thiQuestions: THIQuestion[] = [
  {
    id: 1,
    text: "耳鸣是否让您难以集中注意力？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 2,
    text: "耳鸣声的音量是否让您难以听清别人说话？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 3,
    text: "耳鸣是否让您感到愤怒、生气？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 4,
    text: "耳鸣是否让您感到困惑或不知所措？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 5,
    text: "耳鸣是否让您感到绝望？",
    category: "catastrophic",
    categoryName: "灾难化倾向"
  },
  {
    id: 6,
    text: "您是否经常抱怨耳鸣？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 7,
    text: "耳鸣是否让您晚上难以入睡？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 8,
    text: "您是否觉得无法逃避耳鸣的干扰？",
    category: "catastrophic",
    categoryName: "灾难化倾向"
  },
  {
    id: 9,
    text: "耳鸣是否干扰了您的社交活动（如聚餐、聚会等）？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 10,
    text: "耳鸣是否让您感到非常沮丧？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 11,
    text: "耳鸣是否让您觉得自己患了严重的疾病？",
    category: "catastrophic",
    categoryName: "灾难化倾向"
  },
  {
    id: 12,
    text: "耳鸣是否让您难以享受生活？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 13,
    text: "耳鸣是否干扰了您的工作或家务劳作？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 14,
    text: "耳鸣是否让您有时觉得烦躁、易怒？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 15,
    text: "耳鸣是否让您难以阅读或看书？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 16,
    text: "耳鸣是否让您在人际关系中感到烦恼？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 17,
    text: "您是否觉得耳鸣影响了您与家人和朋友的沟通？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 18,
    text: "您是否觉得难以将注意力从耳鸣上转移开？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 19,
    text: "您是否觉得对耳鸣无能为力、无法掌控？",
    category: "catastrophic",
    categoryName: "灾难化倾向"
  },
  {
    id: 20,
    text: "您是否经常感到疲倦或缺乏精力？",
    category: "functional",
    categoryName: "功能影响"
  },
  {
    id: 21,
    text: "耳鸣是否让您感到焦虑或心情低落？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 22,
    text: "耳鸣是否让您感到极度难以忍受？",
    category: "catastrophic",
    categoryName: "灾难化倾向"
  },
  {
    id: 23,
    text: "您是否觉得耳鸣已经把您逼到了崩溃的边缘？",
    category: "catastrophic",
    categoryName: "灾难化倾向"
  },
  {
    id: 24,
    text: "当压力增大时，您的耳鸣是否会明显加重？",
    category: "emotional",
    categoryName: "情绪影响"
  },
  {
    id: 25,
    text: "耳鸣是否让您感到不安全或处于惶恐中？",
    category: "emotional",
    categoryName: "情绪影响"
  }
];

export interface THIResult {
  score: number;
  grade: number;
  severity: string;
  description: string;
  recommendation: string;
}

export function calculateTHIGrade(score: number): THIResult {
  if (score <= 16) {
    return {
      score,
      grade: 1,
      severity: "微弱 (Slight)",
      description: "仅在极安静的环境中能隐约听到耳鸣，对日常生活、工作及情绪几乎没有负面干扰。",
      recommendation: "无需过度担心。保持良好的生活习惯、规律作息，避免长时间暴露在过高分贝的噪声中。一般不需要特殊声疗治疗。"
    };
  } else if (score <= 36) {
    return {
      score,
      grade: 2,
      severity: "轻度 (Mild)",
      description: "在安静环境下耳鸣较清晰，容易在注意力不集中或压力大时显现，能被环境杂音轻松遮盖，对睡眠有轻微干扰。",
      recommendation: "日常可在安静的书房或卧室播放轻柔的背景背景音乐、自然声（雨声、鸟鸣），多参加社交、丰富声环境，防止大脑过度聚焦在耳鸣音上。"
    };
  } else if (score <= 56) {
    return {
      score,
      grade: 3,
      severity: "中度 (Moderate)",
      description: "耳鸣在日常活动中经常能听到，通常在安静、压力大或情绪不佳时变得刺耳，对睡眠、日常工作和情绪有显著干扰。",
      recommendation: "建议采用声疗法（Sound Therapy）进行声再训练，每日坚持使用本系统的声音发生器，将其设为比耳鸣稍低、能让其“混合”的音量。配合认知调节，如有必要可咨询医生开展心理疏导。"
    };
  } else if (score <= 76) {
    return {
      score,
      grade: 4,
      severity: "重度 (Severe)",
      description: "耳鸣在任何时候都极其刺耳，严重妨碍正常社交、交谈、阅读，并引起严重的失眠、焦躁、抑郁或恐慌情绪。",
      recommendation: "强烈推荐前往三甲医院耳鼻喉科或听力科就诊。建议由临床专业人员指导进行定制声掩蔽器治疗或 TRT 疗法，可能需要配合抗焦虑等药物改善睡眠与心理压力。"
    };
  } else {
    return {
      score,
      grade: 5,
      severity: "极重度 (Catastrophic)",
      description: "耳鸣几乎无法忍受，24小时不间断折磨大脑，产生濒临崩溃、绝望、严重的惊恐情绪，对所有工作与社交生活产生破坏性打击。",
      recommendation: "这是极为严重的警示。请务必立即就医，寻求耳鼻喉科、听力科及心理医学科的跨学科协作诊治。急需实施听觉剥夺重建、专业心理支持治疗、TRT疗法以及药物干预以降低耳蜗与中枢听觉通路的超高兴奋性。"
    };
  }
}
