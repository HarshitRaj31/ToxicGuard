// Local JavaScript fallback classifier matching ai-model/model.py output format
const PATTERNS = [
  {
    label: "threat",
    category: "Threat",
    confidence: 95.4,
    regex: /\b(kill|murder|hurt you|destroy you|shoot|bomb|die|death threat|attack you|beat you)\b/i,
  },
  {
    label: "identity_hate",
    category: "Hate Speech",
    confidence: 93.8,
    regex: /\b(bigot|racist|slur|subhuman|go back to your country|hate all|inferior race|nazis?)\b/i,
  },
  {
    label: "obscene",
    category: "Offensive",
    confidence: 91.2,
    regex: /\b(fuck|shit|bitch|asshole|bastard|dick|crap|bullshit|damn you|wtf|stfu)\b/i,
  },
  {
    label: "insult",
    category: "Insult",
    confidence: 88.6,
    regex: /\b(idiot|stupid|moron|dumb|loser|pathetic|worthless|clown|trash|garbage|ugly|shut up|fool|ignorant)\b/i,
  },
  {
    label: "toxic",
    category: "Toxic",
    confidence: 86.5,
    regex: /\b(hate you|disgusting|horrible person|toxic|vile|despise|awful|nobody likes you|get lost)\b/i,
  },
];

function predictFallback(text) {
  const normalized = String(text || "").trim();
  const detectedLabels = [];
  let primaryMatch = null;

  for (const item of PATTERNS) {
    if (item.regex.test(normalized)) {
      detectedLabels.push(item.label);
      if (!primaryMatch) {
        primaryMatch = item;
      }
    }
  }

  if (!primaryMatch) {
    return {
      result: "Safe",
      category: "Non-Toxic",
      confidence: 96.2,
      detectedLabels: [],
    };
  }

  if (!detectedLabels.includes("toxic")) {
    detectedLabels.unshift("toxic");
  }

  return {
    result: "Toxic",
    category: primaryMatch.category,
    confidence: primaryMatch.confidence,
    detectedLabels,
  };
}

module.exports = { predictFallback };
