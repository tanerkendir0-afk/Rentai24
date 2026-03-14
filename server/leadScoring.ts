export function computeLeadScore(lead: { status: string; updatedAt: Date | string }): string {
  const statusWeight: Record<string, number> = {
    won: 100, negotiation: 85, proposal: 70, qualified: 55,
    contacted: 35, new: 20, lost: 0,
  };
  const baseScore = statusWeight[lead.status] || 20;
  const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const recencyBonus = daysSinceUpdate <= 3 ? 15 : daysSinceUpdate <= 7 ? 5 : -10;
  const totalScore = Math.max(0, Math.min(100, baseScore + recencyBonus));
  if (totalScore >= 60) return "hot";
  if (totalScore >= 30) return "warm";
  return "cold";
}
