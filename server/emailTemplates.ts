export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const templates: Record<string, EmailTemplate> = {
  cold_outreach: {
    id: "cold_outreach",
    name: "Cold Outreach",
    subject: "Quick question for {{company}}",
    body: `Hi {{name}},

I came across {{company}} and was impressed by what you're building. I wanted to reach out because we help companies like yours achieve better results with AI-powered solutions.

I'd love to learn more about your current challenges and explore if there's a fit. Would you be open to a quick 15-minute call this week?

Looking forward to connecting.

Best regards`,
  },
  follow_up: {
    id: "follow_up",
    name: "Follow Up",
    subject: "Following up — {{company}}",
    body: `Hi {{name}},

I wanted to follow up on my previous message. I understand you're busy, but I believe there's a real opportunity for {{company}} to benefit from what we offer.

Here's a quick summary of how we've helped similar companies:
- Reduced operational costs by 40%
- Increased team productivity by 3x
- Automated repetitive tasks saving 20+ hours/week

Would a brief conversation make sense? I'm happy to work around your schedule.

Best regards`,
  },
  value_proposition: {
    id: "value_proposition",
    name: "Value Proposition",
    subject: "How {{company}} can save 20+ hours/week",
    body: `Hi {{name}},

Companies like {{company}} often face these challenges:
- Teams spending too much time on repetitive tasks
- Difficulty scaling operations without scaling headcount
- Inconsistent quality when workload increases

We've built AI-powered solutions that address exactly these pain points. Our clients typically see:
- 40% reduction in operational costs
- 3x increase in throughput
- ROI within the first 30 days

I'd love to show you a quick demo tailored to {{company}}'s needs. Are you available for a 20-minute call this week?

Best regards`,
  },
  meeting_request: {
    id: "meeting_request",
    name: "Meeting Request",
    subject: "Demo request — AI solutions for {{company}}",
    body: `Hi {{name}},

Thank you for your interest in our AI solutions. I'd like to schedule a personalized demo to show you exactly how we can help {{company}}.

In the demo, I'll cover:
- How our AI workers handle tasks specific to your industry
- Live examples of automation in action
- Custom pricing based on your needs

Would any of these times work for you?
- [Time slot 1]
- [Time slot 2]
- [Time slot 3]

If none of these work, just let me know your availability and I'll find a time that suits you.

Best regards`,
  },
  proposal: {
    id: "proposal",
    name: "Proposal",
    subject: "Proposal: AI Solutions for {{company}}",
    body: `Hi {{name}},

Following our discussion, I'm pleased to share a tailored proposal for {{company}}.

EXECUTIVE SUMMARY
We propose implementing AI-powered workforce solutions to help {{company}} streamline operations, reduce costs, and accelerate growth.

RECOMMENDED SOLUTION
Based on your needs, we recommend:
- AI Workers tailored to your specific workflows
- 24/7 availability with no downtime
- Seamless integration with your existing tools

INVESTMENT
Our solutions start at $49/month per AI worker, with volume discounts available for multiple deployments.

NEXT STEPS
1. Review this proposal
2. Schedule a final Q&A call
3. Begin onboarding (typically 24-48 hours)

I'm confident this partnership will deliver significant value to {{company}}. Let me know if you have any questions.

Best regards`,
  },
};

export function getTemplate(templateId: string): EmailTemplate | null {
  return templates[templateId] || null;
}

export function listTemplates(): EmailTemplate[] {
  return Object.values(templates);
}

export function fillTemplate(template: EmailTemplate, params: { name?: string; company?: string }): { subject: string; body: string } {
  const name = params.name || "there";
  const company = params.company || "your company";
  return {
    subject: template.subject.replace(/\{\{name\}\}/g, name).replace(/\{\{company\}\}/g, company),
    body: template.body.replace(/\{\{name\}\}/g, name).replace(/\{\{company\}\}/g, company),
  };
}

export const DRIP_SEQUENCES: Record<string, Array<{ delayDays: number; templateId: string; stepName: string }>> = {
  standard: [
    { delayDays: 1, templateId: "cold_outreach", stepName: "Initial Outreach" },
    { delayDays: 3, templateId: "value_proposition", stepName: "Value Proposition" },
    { delayDays: 7, templateId: "meeting_request", stepName: "Meeting Request" },
  ],
  aggressive: [
    { delayDays: 1, templateId: "cold_outreach", stepName: "Initial Outreach" },
    { delayDays: 2, templateId: "follow_up", stepName: "Quick Follow-up" },
    { delayDays: 3, templateId: "value_proposition", stepName: "Value Proposition" },
    { delayDays: 5, templateId: "meeting_request", stepName: "Meeting Request" },
    { delayDays: 7, templateId: "proposal", stepName: "Proposal" },
  ],
  gentle: [
    { delayDays: 1, templateId: "cold_outreach", stepName: "Introduction" },
    { delayDays: 7, templateId: "value_proposition", stepName: "Value Proposition" },
    { delayDays: 14, templateId: "meeting_request", stepName: "Meeting Request" },
  ],
};
