export async function getAgentSystemPrompt(agentType: string): Promise<string | null> {
  const { agentSystemPrompts } = await import("../routes");
  return agentSystemPrompts[agentType] ?? null;
}
