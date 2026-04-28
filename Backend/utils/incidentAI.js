const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'with', 'without',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'at', 'to', 'from', 'of',
  'in', 'on', 'for', 'by', 'as', 'this', 'that', 'these', 'those', 'it', 'its',
  'we', 'they', 'he', 'she', 'you', 'your', 'our', 'their', 'near', 'around'
]);

const KEYWORD_MAP = {
  fire: ['fire', 'smoke', 'burn', 'flames', 'explosion', 'blast', 'gas', 'short-circuit'],
  medical: ['injury', 'injured', 'bleeding', 'unconscious', 'collapse', 'heart', 'stroke', 'ambulance'],
  flood: ['flood', 'flooding', 'water', 'overflow', 'submerged', 'rain'],
  earthquake: ['earthquake', 'tremor', 'aftershock', 'quake', 'collapse'],
  storm: ['storm', 'cyclone', 'hurricane', 'tornado', 'wind', 'lightning'],
  accident: ['accident', 'crash', 'collision', 'vehicle', 'traffic', 'road', 'pileup']
};

const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
};

const extractKeywords = (description) => {
  const tokens = tokenize(description);
  return [...new Set(tokens)].slice(0, 15);
};

const suggestType = (description) => {
  const tokens = tokenize(description);
  const scores = Object.keys(KEYWORD_MAP).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  Object.entries(KEYWORD_MAP).forEach(([type, keywords]) => {
    keywords.forEach(keyword => {
      if (tokens.includes(keyword)) {
        scores[type] += 1;
      }
    });
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0 || sorted[0][1] === 0) return 'other';
  return sorted[0][0];
};

const suggestSeverity = (description, severity) => {
  const tokens = tokenize(description);
  const highImpact = ['explosion', 'collapsed', 'collapse', 'trapped', 'dead', 'multiple', 'critical'];
  const mediumImpact = ['injury', 'injured', 'bleeding', 'smoke', 'flood', 'fire'];

  if (highImpact.some(word => tokens.includes(word))) return Math.max(severity || 3, 5);
  if (mediumImpact.some(word => tokens.includes(word))) return Math.max(severity || 3, 4);
  return severity || 3;
};

const summaryFromDescription = (description, fallbackType) => {
  if (!description) return `${fallbackType} incident reported.`;
  const trimmed = description.trim();
  if (trimmed.length <= 120) return trimmed;
  return `${trimmed.slice(0, 117)}...`;
};

const priorityFromSeverity = (severity) => {
  if (severity >= 5) return 'critical';
  if (severity === 4) return 'high';
  if (severity === 3) return 'medium';
  return 'low';
};

const jaccardSimilarity = (aTokens, bTokens) => {
  if (!aTokens.length || !bTokens.length) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const intersection = [...aSet].filter(t => bSet.has(t)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
};

const distanceKm = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (value) => (value * Math.PI) / 180;
  const lat1 = a.lat || (a.coordinates && a.coordinates[1]);
  const lon1 = a.lng || (a.coordinates && a.coordinates[0]);
  const lat2 = b.lat || (b.coordinates && b.coordinates[1]);
  const lon2 = b.lng || (b.coordinates && b.coordinates[0]);
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Number.POSITIVE_INFINITY;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const aCalc = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const cCalc = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return 6371 * cCalc;
};

const buildIncidentAI = (incident, recentIncidents = []) => {
  const keywords = extractKeywords(incident.description);
  const suggestedType = incident.type && incident.type !== 'other'
    ? incident.type
    : suggestType(incident.description);
  const suggestedSeverity = suggestSeverity(incident.description, incident.severity);
  const priority = priorityFromSeverity(suggestedSeverity);
  const summary = summaryFromDescription(incident.description, suggestedType);

  let bestDuplicate = null;
  let bestScore = 0;

  recentIncidents.forEach((existing) => {
    const distance = distanceKm(incident.location, existing.location);
    if (distance > 5) return;
    const similarity = jaccardSimilarity(keywords, extractKeywords(existing.description));
    const proximityScore = Math.max(0, 1 - distance / 5);
    const score = (similarity * 0.6) + (proximityScore * 0.4);
    if (score > bestScore) {
      bestScore = score;
      bestDuplicate = existing;
    }
  });

  const duplicateScore = bestScore >= 0.6 ? Number(bestScore.toFixed(2)) : null;
  const duplicateOf = duplicateScore ? bestDuplicate.id : null;

  return {
    suggestedType,
    suggestedSeverity,
    priority,
    keywords,
    summary,
    duplicateOf,
    duplicateScore,
    confidence: Number(Math.min(1, (keywords.length / 8)).toFixed(2))
  };
};

module.exports = {
  buildIncidentAI
};
