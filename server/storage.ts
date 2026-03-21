import { db } from "./db";
import { users, rentals, contactMessages, newsletterSubscribers, leads, agentActions, emailCampaigns, supportTickets, tokenUsage, agentTasks, chatMessages, conversations, teamMembers, bossNotifications, socialAccounts, shippingProviders, guardrailLogs, systemSettings, scheduledPosts, whatsappConfig, whatsappMessages, agentLimits, escalationRules, escalations, escalationMessages, agentInstructions, globalAgentInstructions, consentLogs, crmDocuments, securityEvents, pageViews, userEvents, feedback, rexContacts, rexDeals, rexActivities, rexSequences, rexStageHistory, rexScoreHistory, rexStageConfig, jobPostings, candidates, applications, LEAD_SOURCE_VALUES, CUSTOMER_SEGMENT_VALUES, DEAL_STAGE_VALUES, ACTIVITY_TYPE_VALUES, SEQUENCE_STATUS_VALUES, type User, type InsertUser, type Rental, type InsertRental, type ContactMessage, type InsertContactMessage, type NewsletterSubscriber, type Lead, type InsertLead, type AgentAction, type InsertAgentAction, type EmailCampaign, type InsertEmailCampaign, type SupportTicket, type InsertSupportTicket, type TokenUsage, type InsertTokenUsage, type AgentTask, type InsertAgentTask, type ChatMessage, type InsertChatMessage, type ConversationRecord, type InsertConversation, type TeamMember, type InsertTeamMember, type BossNotification, type InsertBossNotification, type SocialAccount, type InsertSocialAccount, type ShippingProvider, type InsertShippingProvider, type GuardrailLog, type ScheduledPost, type InsertScheduledPost, type WhatsappConfig, type InsertWhatsappConfig, type WhatsappMessage, type InsertWhatsappMessage, type AgentLimit, type InsertAgentLimit, type EscalationRule, type InsertEscalationRule, type Escalation, type InsertEscalation, type EscalationMessage, type InsertEscalationMessage, type AgentInstruction, type InsertAgentInstruction, type GlobalAgentInstruction, type ConsentLog, type InsertConsentLog, type CrmDocument, type InsertCrmDocument, type PageView, type InsertPageView, type UserEvent, type InsertUserEvent, type Feedback, type InsertFeedback, type JobPosting, type InsertJobPosting, type Candidate, type InsertCandidate, type Application, type InsertApplication, type RexContact, type InsertRexContact, type RexDeal, type InsertRexDeal, type RexActivity, type InsertRexActivity, type RexSequence, type InsertRexSequence, type RexStageHistory, type RexScoreHistory, type RexStageConfig, type LeadSourceValue, type CustomerSegmentValue, type DealStageValue, type ActivityTypeValue, type SequenceStatusValue } from "@shared/schema";
import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import * as cryptoModule from "crypto";
import { scheduledTasks, scheduledTaskRuns, type ScheduledTask, type InsertScheduledTask, type ScheduledTaskRun, type InsertScheduledTaskRun } from "@shared/schema";
import { boostSubscriptions, type BoostSubscription, type InsertBoostSubscription } from "@shared/schema";
import { organizations, organizationMembers, organizationInvites, agentDocuments, type Organization, type InsertOrganization, type OrganizationMember, type InsertOrganizationMember, type OrganizationInvite, type InsertOrganizationInvite, type OrgRole, type AgentDocument } from "@shared/schema";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, info: { stripeCustomerId?: string; stripeSubscriptionId?: string | null }): Promise<User | undefined>;
  updateUserProfile(userId: number, updates: { fullName?: string; company?: string | null }): Promise<User | undefined>;
  updateUserOnboarding(userId: number, updates: { industry?: string | null; companySize?: string | null; country?: string | null; intendedAgents?: string[] | null; referralSource?: string | null; onboardingCompleted?: boolean }): Promise<User | undefined>;
  updateUserLanguage(userId: number, language: string): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined>;
  addImageCredits(userId: number, credits: number): Promise<User | undefined>;
  useImageCredit(userId: number): Promise<boolean>;

  createRental(rental: InsertRental): Promise<Rental>;
  getRentalsByUser(userId: number): Promise<Rental[]>;
  getActiveRental(userId: number, agentType: string): Promise<Rental | undefined>;
  incrementUsage(rentalId: number): Promise<void>;
  activateUserRentals(userId: number): Promise<void>;
  deactivateUserRentals(userId: number): Promise<void>;

  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean): Promise<any[]>;
  listProductsWithPrices(active?: boolean): Promise<any[]>;
  getPrice(priceId: string): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;

  createContactMessage(msg: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  createNewsletterSubscriber(email: string): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;

  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByUser(userId: number): Promise<Lead[]>;
  getLeadById(id: number, userId: number): Promise<Lead | undefined>;
  updateLead(id: number, userId: number, updates: Partial<Pick<Lead, "name" | "email" | "company" | "status" | "notes" | "score">>): Promise<Lead | undefined>;
  updateLeadScore(id: number, userId: number, score: string): Promise<Lead | undefined>;

  createAgentAction(action: InsertAgentAction): Promise<AgentAction>;
  getAgentAction(id: number): Promise<AgentAction | undefined>;
  getActionsByUser(userId: number): Promise<AgentAction[]>;

  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  getCampaignsByUser(userId: number): Promise<EmailCampaign[]>;
  getActiveCampaigns(userId: number): Promise<EmailCampaign[]>;
  updateCampaignStep(id: number, userId: number, currentStep: number, status?: string, steps?: unknown): Promise<EmailCampaign | undefined>;

  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getTicketsByUser(userId: number): Promise<SupportTicket[]>;
  getTicketById(id: number, userId: number): Promise<SupportTicket | undefined>;
  updateTicket(id: number, userId: number, updates: Partial<Pick<SupportTicket, "status" | "priority" | "resolution" | "subject" | "description">>): Promise<SupportTicket | undefined>;
  getAllTickets(): Promise<SupportTicket[]>;
  adminUpdateTicket(id: number, updates: Partial<Pick<SupportTicket, "status" | "priority" | "resolution" | "adminReply">>): Promise<SupportTicket | undefined>;

  createAgentTask(task: InsertAgentTask): Promise<AgentTask>;
  getAgentTasksByUser(userId: number, agentType?: string): Promise<AgentTask[]>;
  updateAgentTask(id: number, userId: number, updates: Partial<Pick<AgentTask, "title" | "description" | "status" | "priority" | "dueDate" | "project" | "delegationStatus" | "delegationResult">>): Promise<AgentTask | undefined>;
  deleteAgentTask(id: number, userId: number): Promise<boolean>;

  logTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage>;
  getTokenUsageSummary(): Promise<any[]>;
  getTokenUsageDetailed(minCostUsd?: number): Promise<any[]>;
  getTokenSpending(userId: number | null, agentType?: string): Promise<number>;
  getProviderComparisonStats(): Promise<any>;

  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByAgent(agentType: string, filters?: { startDate?: Date; endDate?: Date }): Promise<ChatMessage[]>;
  getChatSessionsByAgent(agentType: string, filters?: { startDate?: Date; endDate?: Date; minTurns?: number; toolUsageOnly?: boolean; excludeBadRated?: boolean; goodOnly?: boolean }): Promise<{ sessionId: string; messages: ChatMessage[] }[]>;

  getConversationsByUser(userId: number, agentType: string): Promise<ConversationRecord[]>;
  getConversationsByOrg(organizationId: number, agentType: string): Promise<ConversationRecord[]>;
  createConversation(convo: InsertConversation): Promise<ConversationRecord>;
  updateConversationTitle(id: number, userId: number, title: string): Promise<ConversationRecord | undefined>;
  deleteConversation(id: number, userId: number): Promise<boolean>;
  getConversationMessages(userId: number, visibleId: string): Promise<ChatMessage[]>;
  getConversationByVisibleId(visibleId: string): Promise<ConversationRecord | undefined>;

  getTeamMembers(userId: number): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, userId: number, updates: Partial<Pick<TeamMember, "name" | "email" | "position" | "department" | "skills" | "responsibilities" | "phone">>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number, userId: number): Promise<boolean>;

  updateUserGmail(userId: number, gmailAddress: string, gmailAppPassword: string): Promise<User | undefined>;
  clearUserGmail(userId: number): Promise<User | undefined>;
  decryptGmailAppPassword(encryptedPassword: string): string;
  updateUserGmailOAuth(userId: number, data: { gmailAddress: string; gmailRefreshToken: string; gmailAccessToken: string | null; gmailTokenExpiry: Date | null }): Promise<User | undefined>;
  updateUserGmailTokens(userId: number, gmailAccessToken: string, gmailTokenExpiry: Date): Promise<void>;
  clearUserGmailOAuth(userId: number): Promise<void>;

  createBossNotification(notification: InsertBossNotification): Promise<BossNotification>;
  markBossNotificationNotified(id: number): Promise<void>;
  getBossNotifications(userId: number, limit?: number): Promise<BossNotification[]>;
  createOwnerNotification(notification: InsertBossNotification): Promise<BossNotification>;
  markOwnerNotificationNotified(id: number): Promise<void>;
  getOwnerNotifications(userId: number, limit?: number): Promise<BossNotification[]>;

  getSocialAccounts(userId: number): Promise<SocialAccount[]>;
  addSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: number, userId: number, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined>;
  deleteSocialAccount(id: number, userId: number): Promise<boolean>;
  getSocialAccountById(id: number, userId: number): Promise<SocialAccount | undefined>;

  getShippingProviders(userId: number): Promise<ShippingProvider[]>;
  addShippingProvider(provider: InsertShippingProvider): Promise<ShippingProvider>;
  updateShippingProvider(id: number, userId: number, updates: Partial<Pick<ShippingProvider, "apiKey" | "customerCode" | "username" | "password" | "accountNumber" | "siteId" | "status">>): Promise<ShippingProvider | undefined>;
  deleteShippingProvider(id: number, userId: number): Promise<boolean>;

  getWhatsappConfig(userId: number): Promise<WhatsappConfig | undefined>;
  saveWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig>;
  deleteWhatsappConfig(userId: number): Promise<boolean>;
  getWhatsappConfigByVerifyToken(verifyToken: string): Promise<WhatsappConfig | undefined>;
  getWhatsappConfigByPhoneNumberId(phoneNumberId: string): Promise<WhatsappConfig | undefined>;
  saveWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  getWhatsappMessages(userId: number, filters?: { direction?: string; agentType?: string; limit?: number }): Promise<WhatsappMessage[]>;
  updateWhatsappMessageStatus(whatsappMessageId: string, status: string): Promise<void>;

  getGuardrailLogs(filters?: { agentType?: string; ruleType?: string; limit?: number; from?: Date; to?: Date }): Promise<GuardrailLog[]>;

  createScheduledPost(post: InsertScheduledPost): Promise<ScheduledPost>;
  getScheduledPosts(userId: number): Promise<ScheduledPost[]>;
  getPendingScheduledPosts(): Promise<ScheduledPost[]>;
  updateScheduledPost(id: number, updates: Partial<ScheduledPost>): Promise<ScheduledPost | undefined>;
  cancelScheduledPost(id: number, userId: number): Promise<boolean>;

  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;

  getAgentLimits(agentType?: string, userId?: number | null): Promise<AgentLimit[]>;
  upsertAgentLimit(limit: InsertAgentLimit): Promise<AgentLimit>;
  deleteAgentLimit(id: number): Promise<boolean>;
  getTokenUsageByPeriod(userId: number | null, agentType: string, period: "daily" | "weekly" | "monthly"): Promise<{ tokens: number; messages: number }>;
  getUsageSummaryByPeriod(agentType: string, period: "daily" | "weekly" | "monthly"): Promise<{ tokens: number; messages: number }>;

  getEscalationRules(): Promise<EscalationRule[]>;
  getActiveEscalationRules(): Promise<EscalationRule[]>;
  upsertEscalationRule(rule: InsertEscalationRule): Promise<EscalationRule>;
  updateEscalationRule(id: number, updates: Partial<InsertEscalationRule>): Promise<EscalationRule | undefined>;
  deleteEscalationRule(id: number): Promise<boolean>;

  createEscalation(escalation: InsertEscalation): Promise<Escalation>;
  getEscalations(filters?: { status?: string; userId?: number }): Promise<Escalation[]>;
  getEscalationById(id: number): Promise<Escalation | undefined>;
  getEscalationByToken(token: string): Promise<Escalation | undefined>;
  getActiveEscalationForUser(userId: number, agentType: string): Promise<Escalation | undefined>;
  updateEscalationStatus(id: number, status: string, resolvedAt?: Date): Promise<Escalation | undefined>;
  joinEscalation(id: number): Promise<Escalation | undefined>;

  createEscalationMessage(msg: InsertEscalationMessage): Promise<EscalationMessage>;
  getEscalationMessages(escalationId: number, after?: Date): Promise<EscalationMessage[]>;

  getAgentInstruction(agentType: string): Promise<AgentInstruction | undefined>;
  getAllAgentInstructions(): Promise<AgentInstruction[]>;
  upsertAgentInstruction(agentType: string, instructions: string): Promise<AgentInstruction>;
  getGlobalInstruction(): Promise<GlobalAgentInstruction | undefined>;
  upsertGlobalInstruction(instructions: string): Promise<GlobalAgentInstruction>;

  getCrmDocuments(userId: number): Promise<CrmDocument[]>;
  getCrmDocumentById(id: number, userId: number): Promise<CrmDocument | undefined>;
  createCrmDocument(doc: InsertCrmDocument): Promise<CrmDocument>;
  deleteCrmDocument(id: number, userId: number): Promise<boolean>;

  createConsentLog(log: InsertConsentLog): Promise<ConsentLog>;
  getConsentLogs(userId: number): Promise<ConsentLog[]>;
  getConsentStats(): Promise<{ consentType: string; granted: number; revoked: number; total: number }[]>;
  updateUserConsent(userId: number, updates: { cookieConsent?: boolean; dataProcessingConsent?: boolean }): Promise<User | undefined>;

  createPageView(pv: InsertPageView): Promise<PageView>;
  createUserEvent(ev: InsertUserEvent): Promise<UserEvent>;
  getAnalyticsSummary(period: "day" | "week" | "month"): Promise<any>;

  createFeedback(fb: InsertFeedback): Promise<Feedback>;
  getLastNpsByUser(userId: number): Promise<Feedback | undefined>;
  getFeedbackList(filters?: { type?: "nps" | "chat_rating" | "general"; limit?: number; offset?: number }): Promise<Feedback[]>;
  getFeedbackSummary(): Promise<{ npsAvg: number; npsCount: number; chatRatingAvg: number; chatRatingCount: number; generalCount: number; categoryDist: { category: string; count: number }[]; agentSatisfaction: { agentType: string; avgScore: number; count: number }[]; npsTrend: { month: string; avg: number; count: number }[] }>;

  deleteUserAndData(userId: number): Promise<boolean>;

  createRexContact(data: InsertRexContact): Promise<RexContact>;
  getRexContact(id: string, userId: number): Promise<RexContact | undefined>;
  getRexContactsByUser(userId: number): Promise<RexContact[]>;
  searchRexContacts(userId: number, filters: { query?: string; segment?: CustomerSegmentValue; source?: LeadSourceValue; minScore?: number; tags?: string[]; limit?: number; offset?: number }): Promise<RexContact[]>;
  updateRexContact(id: string, userId: number, data: Partial<InsertRexContact>): Promise<RexContact | undefined>;
  deleteRexContact(id: string, userId: number): Promise<boolean>;

  createRexDeal(data: InsertRexDeal): Promise<RexDeal>;
  getRexDeal(id: string, userId: number): Promise<RexDeal | undefined>;
  getRexDealsByUser(userId: number): Promise<RexDeal[]>;
  getRexDealsByContact(contactId: string, userId: number): Promise<RexDeal[]>;
  searchRexDeals(userId: number, filters: { stage?: DealStageValue; minValue?: number; contactId?: string; limit?: number; offset?: number }): Promise<RexDeal[]>;
  updateRexDeal(id: string, userId: number, data: Partial<InsertRexDeal>): Promise<RexDeal | undefined>;
  updateRexDealStage(id: string, userId: number, newStage: DealStageValue, notes?: string): Promise<RexDeal | undefined>;
  getRexPipelineSummary(userId: number): Promise<{ stage: string; count: number; totalValue: number }[]>;
  getRexConversionFunnel(userId: number): Promise<{ stage: string; count: number; dropoff: number }[]>;

  createRexActivity(data: InsertRexActivity): Promise<RexActivity>;
  getRexActivities(userId: number, filters: { contactId?: string; dealId?: string; type?: ActivityTypeValue; limit?: number; offset?: number }): Promise<RexActivity[]>;
  getRexActivitiesByContact(contactId: string, userId: number): Promise<RexActivity[]>;

  createRexSequence(data: InsertRexSequence): Promise<RexSequence>;
  getRexSequences(userId: number, filters: { contactId?: string; status?: SequenceStatusValue; limit?: number }): Promise<RexSequence[]>;
  getActiveSequences(userId: number): Promise<RexSequence[]>;
  updateRexSequence(id: string, userId: number, data: Partial<InsertRexSequence>): Promise<RexSequence | undefined>;

  getRexStageConfig(): Promise<RexStageConfig[]>;

  createJobPosting(data: InsertJobPosting): Promise<JobPosting>;
  getJobPostings(userId: number, status?: string): Promise<JobPosting[]>;
  getJobPostingById(id: number, userId: number): Promise<JobPosting | undefined>;
  getJobPostingByPostingId(postingId: string, userId: number): Promise<JobPosting | undefined>;
  updateJobPosting(id: number, userId: number, updates: Partial<InsertJobPosting>): Promise<JobPosting | undefined>;

  createCandidate(data: InsertCandidate): Promise<Candidate>;
  getCandidates(userId: number): Promise<Candidate[]>;
  getCandidateById(id: number, userId: number): Promise<Candidate | undefined>;
  updateCandidate(id: number, userId: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined>;

  createApplication(data: InsertApplication): Promise<Application>;
  getApplications(userId: number, filters?: { jobPostingId?: number; status?: string }): Promise<Application[]>;
  getApplicationById(id: number, userId: number): Promise<Application | undefined>;
  updateApplicationStatus(id: number, userId: number, status: string, notes?: string, interviewDate?: Date): Promise<Application | undefined>;
  updateApplicationScore(id: number, userId: number, score: number): Promise<Application | undefined>;
  getPipelineSummary(userId: number): Promise<{ status: string; count: number }[]>;
  getCandidatesWithScoresForJob(jobPostingId: number, userId: number): Promise<(Application & { candidate: Candidate })[]>;
  deleteJobPosting(id: number, userId: number): Promise<boolean>;
  deleteCandidate(id: number, userId: number): Promise<boolean>;
  deleteApplication(id: number, userId: number): Promise<boolean>;

  createScheduledTask(data: InsertScheduledTask): Promise<ScheduledTask>;
  getScheduledTasks(userId: number): Promise<ScheduledTask[]>;
  getScheduledTaskById(id: number, userId: number): Promise<ScheduledTask | undefined>;
  updateScheduledTask(id: number, userId: number, updates: Partial<InsertScheduledTask>): Promise<ScheduledTask | undefined>;
  deleteScheduledTask(id: number, userId: number): Promise<boolean>;
  getActiveScheduledTasks(): Promise<ScheduledTask[]>;
  updateScheduledTaskRunInfo(id: number, updates: { lastRunAt: Date; nextRunAt?: Date; runCount?: number }): Promise<void>;

  createScheduledTaskRun(data: InsertScheduledTaskRun): Promise<ScheduledTaskRun>;
  getScheduledTaskRuns(taskId: number, userId: number, limit?: number): Promise<ScheduledTaskRun[]>;
  updateScheduledTaskRun(id: number, updates: { status: string; result?: string; error?: string; durationMs?: number; completedAt: Date }): Promise<void>;

  createBoostSubscription(data: InsertBoostSubscription): Promise<BoostSubscription>;
  getActiveBoostSubscription(userId: number): Promise<BoostSubscription | undefined>;
  getBoostSubscriptionByStripeId(stripeSubId: string): Promise<BoostSubscription | undefined>;
  updateBoostSubscription(id: number, updates: Partial<Pick<BoostSubscription, "status" | "stripeBoostSubId" | "expiresAt" | "boostPlan" | "maxParallelTasks">>): Promise<BoostSubscription | undefined>;
  deactivateBoostSubscription(userId: number): Promise<void>;
  updateConversationBoostStatus(conversationId: number, boostStatus: string): Promise<void>;
  getActiveBoostConversations(userId: number, agentType?: string): Promise<ConversationRecord[]>;

  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationsByUser(userId: number): Promise<Organization[]>;
  getOrganizationByOwner(ownerId: number): Promise<Organization | undefined>;
  getOrganizationForUser(userId: number): Promise<Organization | undefined>;
  updateOrganization(id: number, updates: Partial<Pick<Organization, "name" | "logoUrl">>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<boolean>;

  addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrganizationMembers(organizationId: number): Promise<(OrganizationMember & { user: { id: number; email: string; fullName: string; username: string } })[]>;
  getOrganizationMember(organizationId: number, userId: number): Promise<OrganizationMember | undefined>;
  updateMemberRole(organizationId: number, userId: number, role: OrgRole): Promise<OrganizationMember | undefined>;
  removeOrganizationMember(organizationId: number, userId: number): Promise<boolean>;
  getUserOrganizationRole(userId: number, organizationId: number): Promise<OrgRole | null>;

  createOrganizationInvite(data: InsertOrganizationInvite): Promise<OrganizationInvite>;
  getOrganizationInviteByToken(token: string): Promise<OrganizationInvite | undefined>;
  getOrganizationInvites(organizationId: number): Promise<OrganizationInvite[]>;
  cancelOrganizationInvite(id: number, organizationId: number): Promise<boolean>;
  acceptOrganizationInvite(token: string, userId: number): Promise<{ success: boolean; organizationId?: number; error?: string }>;
  getPendingInvitesByEmail(email: string): Promise<OrganizationInvite[]>;

  getOrgRentals(organizationId: number): Promise<Rental[]>;
  getOrgActiveRental(organizationId: number, agentType: string): Promise<Rental | undefined>;
  transferOrganizationOwnership(organizationId: number, newOwnerId: number): Promise<void>;

  getOrgRexContacts(organizationId: number): Promise<RexContact[]>;
  getOrgCrmDocuments(organizationId: number): Promise<CrmDocument[]>;
  getOrgAgentDocuments(organizationId: number): Promise<AgentDocument[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createRental(rental: InsertRental): Promise<Rental> {
    const [created] = await db.insert(rentals).values(rental).returning();
    return created;
  }

  async getRentalsByUser(userId: number): Promise<Rental[]> {
    return db.select().from(rentals).where(eq(rentals.userId, userId));
  }

  async getActiveRental(userId: number, agentType: string): Promise<Rental | undefined> {
    const [rental] = await db
      .select()
      .from(rentals)
      .where(and(eq(rentals.userId, userId), eq(rentals.agentType, agentType), eq(rentals.status, "active")));
    return rental;
  }

  async incrementUsage(rentalId: number): Promise<void> {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId));
    if (rental) {
      const now = new Date();
      const resetAt = rental.dailyResetAt ? new Date(rental.dailyResetAt) : new Date(0);
      const needsReset = now.toDateString() !== resetAt.toDateString();

      await db
        .update(rentals)
        .set({
          messagesUsed: rental.messagesUsed + 1,
          dailyMessagesUsed: needsReset ? 1 : (rental.dailyMessagesUsed || 0) + 1,
          dailyResetAt: needsReset ? now : rental.dailyResetAt,
        })
        .where(eq(rentals.id, rentalId));
    }
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async updateUserStripeInfo(userId: number, info: { stripeCustomerId?: string; stripeSubscriptionId?: string | null }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(info).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserProfile(userId: number, updates: { fullName?: string; company?: string | null }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserOnboarding(userId: number, updates: { industry?: string | null; companySize?: string | null; country?: string | null; intendedAgents?: string[] | null; referralSource?: string | null; onboardingCompleted?: boolean }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserLanguage(userId: number, language: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ language }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async addImageCredits(userId: number, credits: number): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ imageCredits: sql`${users.imageCredits} + ${credits}` })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async useImageCredit(userId: number): Promise<boolean> {
    const result = await db.update(users)
      .set({ imageCredits: sql`${users.imageCredits} - 1` })
      .where(and(eq(users.id, userId), sql`${users.imageCredits} > 0`))
      .returning();
    return result.length > 0;
  }

  async activateUserRentals(userId: number): Promise<void> {
    await db.update(rentals).set({ status: 'active' }).where(
      and(eq(rentals.userId, userId), eq(rentals.status, 'inactive'))
    );
  }

  async deactivateUserRentals(userId: number): Promise<void> {
    await db.update(rentals).set({ status: 'inactive' }).where(
      and(eq(rentals.userId, userId), eq(rentals.status, 'active'))
    );
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async createContactMessage(msg: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(msg).returning();
    return created;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async createNewsletterSubscriber(email: string): Promise<NewsletterSubscriber> {
    const [created] = await db.insert(newsletterSubscribers).values({ email }).returning();
    return created;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async getLeadsByUser(userId: number): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async getLeadById(id: number, userId: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
    return lead;
  }

  async updateLead(id: number, userId: number, updates: Partial<Pick<Lead, "name" | "email" | "company" | "status" | "notes" | "score">>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .returning();
    return updated;
  }

  async updateLeadScore(id: number, userId: number, score: string): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ score })
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .returning();
    return updated;
  }

  async createAgentAction(action: InsertAgentAction): Promise<AgentAction> {
    const [created] = await db.insert(agentActions).values(action).returning();
    return created;
  }

  async getAgentAction(id: number): Promise<AgentAction | undefined> {
    const [action] = await db.select().from(agentActions).where(eq(agentActions.id, id));
    return action;
  }

  async getActionsByUser(userId: number): Promise<AgentAction[]> {
    return db.select().from(agentActions).where(eq(agentActions.userId, userId)).orderBy(desc(agentActions.createdAt));
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }

  async getCampaignsByUser(userId: number): Promise<EmailCampaign[]> {
    return db.select().from(emailCampaigns).where(eq(emailCampaigns.userId, userId)).orderBy(desc(emailCampaigns.createdAt));
  }

  async getActiveCampaigns(userId: number): Promise<EmailCampaign[]> {
    return db.select().from(emailCampaigns).where(and(eq(emailCampaigns.userId, userId), eq(emailCampaigns.status, "active"))).orderBy(desc(emailCampaigns.createdAt));
  }

  async updateCampaignStep(id: number, userId: number, currentStep: number, status?: string, steps?: unknown): Promise<EmailCampaign | undefined> {
    const updates: Record<string, unknown> = { currentStep };
    if (status) updates.status = status;
    if (steps) updates.steps = steps;
    const [updated] = await db
      .update(emailCampaigns)
      .set(updates)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.userId, userId)))
      .returning();
    return updated;
  }
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async getTicketsByUser(userId: number): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  }

  async getTicketById(id: number, userId: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)));
    return ticket;
  }

  async updateTicket(id: number, userId: number, updates: Partial<Pick<SupportTicket, "status" | "priority" | "resolution" | "subject" | "description">>): Promise<SupportTicket | undefined> {
    const [updated] = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)))
      .returning();
    return updated;
  }

  async getAllTickets(): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async adminUpdateTicket(id: number, updates: Partial<Pick<SupportTicket, "status" | "priority" | "resolution" | "adminReply">>): Promise<SupportTicket | undefined> {
    const [updated] = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated;
  }

  async logTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage> {
    const [created] = await db.insert(tokenUsage).values(usage).returning();
    return created;
  }

  async getTokenUsageSummary(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        t.agent_type,
        COALESCE(u.email, 'anonymous') as user_email,
        COALESCE(u.full_name, 'Anonymous') as user_name,
        COUNT(*)::int as request_count,
        SUM(t.prompt_tokens)::int as total_prompt_tokens,
        SUM(t.completion_tokens)::int as total_completion_tokens,
        SUM(t.total_tokens)::int as total_tokens,
        SUM(CAST(t.cost_usd AS DECIMAL(10,6)))::text as total_cost,
        MAX(t.created_at) as last_used
      FROM token_usage t
      LEFT JOIN users u ON t.user_id = u.id
      GROUP BY t.agent_type, u.email, u.full_name
      ORDER BY SUM(CAST(t.cost_usd AS DECIMAL(10,6))) DESC
    `);
    return result.rows;
  }

  async getProviderComparisonStats(): Promise<any> {
    const byProvider = await db.execute(sql`
      SELECT
        COALESCE(ai_provider, 'openai') as provider,
        model,
        COUNT(*)::int as request_count,
        SUM(prompt_tokens)::int as total_prompt_tokens,
        SUM(completion_tokens)::int as total_completion_tokens,
        SUM(total_tokens)::int as total_tokens,
        SUM(CAST(cost_usd AS DECIMAL(10,6)))::text as total_cost,
        AVG(CAST(cost_usd AS DECIMAL(10,6)))::text as avg_cost_per_request
      FROM token_usage
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY COALESCE(ai_provider, 'openai'), model
      ORDER BY SUM(CAST(cost_usd AS DECIMAL(10,6))) DESC
    `);

    const byAgent = await db.execute(sql`
      SELECT
        agent_type,
        COALESCE(ai_provider, 'openai') as provider,
        COUNT(*)::int as request_count,
        SUM(CAST(cost_usd AS DECIMAL(10,6)))::text as total_cost,
        AVG(total_tokens)::int as avg_tokens
      FROM token_usage
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY agent_type, COALESCE(ai_provider, 'openai')
      ORDER BY agent_type, provider
    `);

    const daily = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COALESCE(ai_provider, 'openai') as provider,
        COUNT(*)::int as request_count,
        SUM(CAST(cost_usd AS DECIMAL(10,6)))::text as total_cost
      FROM token_usage
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at), COALESCE(ai_provider, 'openai')
      ORDER BY date DESC, provider
    `);

    return {
      byProvider: byProvider.rows,
      byAgent: byAgent.rows,
      daily: daily.rows,
    };
  }

  async getTokenUsageDetailed(minCostUsd = 0): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        t.id,
        t.user_id,
        COALESCE(u.email, 'anonymous') as user_email,
        COALESCE(u.full_name, 'Anonymous') as user_name,
        t.agent_type,
        t.model,
        t.prompt_tokens,
        t.completion_tokens,
        t.total_tokens,
        t.cost_usd,
        t.operation_type,
        t.created_at
      FROM token_usage t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE CAST(t.cost_usd AS DECIMAL(10,6)) >= ${minCostUsd}
      ORDER BY t.created_at DESC
      LIMIT 500
    `);
    return result.rows;
  }

  async getTokenSpending(userId: number | null, agentType?: string): Promise<number> {
    let result;
    if (userId) {
      if (agentType) {
        result = await db.execute(sql`
          SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total
          FROM token_usage
          WHERE user_id = ${userId} AND agent_type = ${agentType}
        `);
      } else {
        result = await db.execute(sql`
          SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total
          FROM token_usage
          WHERE user_id = ${userId}
        `);
      }
    } else {
      result = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total
        FROM token_usage
        WHERE user_id IS NULL
      `);
    }
    return parseFloat((result.rows[0] as any)?.total || "0");
  }

  async createAgentTask(task: InsertAgentTask): Promise<AgentTask> {
    const [created] = await db.insert(agentTasks).values(task).returning();
    return created;
  }

  async getAgentTasksByUser(userId: number, agentType?: string): Promise<AgentTask[]> {
    if (agentType) {
      return db.select().from(agentTasks).where(and(eq(agentTasks.userId, userId), eq(agentTasks.agentType, agentType))).orderBy(desc(agentTasks.createdAt));
    }
    return db.select().from(agentTasks).where(eq(agentTasks.userId, userId)).orderBy(desc(agentTasks.createdAt));
  }

  async updateAgentTask(id: number, userId: number, updates: Partial<Pick<AgentTask, "title" | "description" | "status" | "priority" | "dueDate" | "project" | "delegationStatus" | "delegationResult">>): Promise<AgentTask | undefined> {
    const [updated] = await db.update(agentTasks).set(updates).where(and(eq(agentTasks.id, id), eq(agentTasks.userId, userId))).returning();
    return updated;
  }

  async deleteAgentTask(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(agentTasks).where(and(eq(agentTasks.id, id), eq(agentTasks.userId, userId))).returning();
    return result.length > 0;
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      const [created] = await db.insert(chatMessages).values(message).returning();
      return created;
    } catch (err: any) {
      if (err.message?.includes('used_tool') || err.message?.includes('column')) {
        const { usedTool, ...withoutTool } = message as any;
        const [created] = await db.insert(chatMessages).values(withoutTool).returning();
        return created;
      }
      throw err;
    }
  }

  async getChatMessagesByAgent(agentType: string, filters?: { startDate?: Date; endDate?: Date }): Promise<ChatMessage[]> {
    const conditions = [eq(chatMessages.agentType, agentType)];
    if (filters?.startDate) conditions.push(gte(chatMessages.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(chatMessages.createdAt, filters.endDate));
    return db.select().from(chatMessages).where(and(...conditions)).orderBy(chatMessages.sessionId, chatMessages.createdAt);
  }

  async getChatSessionsByAgent(
    agentType: string,
    filters?: { startDate?: Date; endDate?: Date; minTurns?: number; toolUsageOnly?: boolean; excludeBadRated?: boolean; goodOnly?: boolean }
  ): Promise<{ sessionId: string; messages: ChatMessage[] }[]> {
    const allMessages = await this.getChatMessagesByAgent(agentType, {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });

    const sessionsMap = new Map<string, ChatMessage[]>();
    for (const msg of allMessages) {
      const existing = sessionsMap.get(msg.sessionId) || [];
      existing.push(msg);
      sessionsMap.set(msg.sessionId, existing);
    }

    let sessions = Array.from(sessionsMap.entries()).map(([sessionId, messages]) => ({
      sessionId,
      messages,
    }));

    if (filters?.goodOnly) {
      const goodSessions = await db.select({ visibleId: conversations.visibleId })
        .from(conversations)
        .where(and(eq(conversations.agentType, agentType), eq(conversations.qualityRating, "good")));
      const goodSet = new Set(goodSessions.map(s => s.visibleId));
      sessions = sessions.filter(s => goodSet.has(s.sessionId));
    } else if (filters?.excludeBadRated) {
      const badSessions = await db.select({ visibleId: conversations.visibleId })
        .from(conversations)
        .where(and(eq(conversations.agentType, agentType), eq(conversations.qualityRating, "bad")));
      const badSet = new Set(badSessions.map(s => s.visibleId));
      sessions = sessions.filter(s => !badSet.has(s.sessionId));
    }

    if (filters?.minTurns && filters.minTurns > 0) {
      sessions = sessions.filter((s) => {
        const userTurns = s.messages.filter((m) => m.role === "user").length;
        return userTurns >= (filters.minTurns || 1);
      });
    }

    if (filters?.toolUsageOnly) {
      sessions = sessions.filter((s) => s.messages.some((m) => m.usedTool));
    }

    return sessions;
  }

  async getConversationsByUser(userId: number, agentType: string): Promise<ConversationRecord[]> {
    return db.select().from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.agentType, agentType)))
      .orderBy(desc(conversations.createdAt));
  }

  async getConversationsByOrg(organizationId: number, agentType: string): Promise<ConversationRecord[]> {
    return db.select().from(conversations)
      .where(and(eq(conversations.organizationId, organizationId), eq(conversations.agentType, agentType)))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(convo: InsertConversation): Promise<ConversationRecord> {
    const [created] = await db.insert(conversations).values(convo).returning();
    return created;
  }

  async updateConversationTitle(id: number, userId: number, title: string): Promise<ConversationRecord | undefined> {
    const [updated] = await db.update(conversations)
      .set({ title })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return updated;
  }

  async deleteConversation(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return !!deleted;
  }

  async getConversationMessages(userId: number, visibleId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(and(eq(chatMessages.sessionId, visibleId), eq(chatMessages.userId, userId)))
      .orderBy(chatMessages.createdAt);
  }

  async getConversationByVisibleId(visibleId: string): Promise<ConversationRecord | undefined> {
    const [convo] = await db.select().from(conversations).where(eq(conversations.visibleId, visibleId));
    return convo;
  }

  async getTeamMembers(userId: number): Promise<TeamMember[]> {
    return db.select().from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .orderBy(teamMembers.name);
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  async updateTeamMember(id: number, userId: number, updates: Partial<Pick<TeamMember, "name" | "email" | "position" | "department" | "skills" | "responsibilities" | "phone">>): Promise<TeamMember | undefined> {
    const [updated] = await db.update(teamMembers)
      .set(updates)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)))
      .returning();
    return updated;
  }

  async deleteTeamMember(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db.delete(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)))
      .returning();
    return !!deleted;
  }

  private getEncryptionKey(): Buffer {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error("SESSION_SECRET environment variable is required for credential encryption. Set it in your environment secrets.");
    }
    return cryptoModule.createHash("sha256").update(secret).digest();
  }

  async updateUserGmail(userId: number, gmailAddress: string, gmailAppPassword: string): Promise<User | undefined> {
    const key = this.getEncryptionKey();
    const iv = cryptoModule.randomBytes(16);
    const cipher = cryptoModule.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(gmailAppPassword, "utf8", "hex");
    encrypted += cipher.final("hex");
    const encryptedPassword = iv.toString("hex") + ":" + encrypted;
    const [updated] = await db.update(users)
      .set({ gmailAddress, gmailAppPassword: encryptedPassword })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  decryptGmailAppPassword(encryptedPassword: string): string {
    try {
      const key = this.getEncryptionKey();
      const [ivHex, encrypted] = encryptedPassword.split(":");
      if (!ivHex || !encrypted) return encryptedPassword;
      const iv = Buffer.from(ivHex, "hex");
      const decipher = cryptoModule.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return encryptedPassword;
    }
  }

  async clearUserGmail(userId: number): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ gmailAddress: null, gmailAppPassword: null })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserGmailOAuth(userId: number, data: { gmailAddress: string; gmailRefreshToken: string; gmailAccessToken: string | null; gmailTokenExpiry: Date | null }): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({
        gmailAddress: data.gmailAddress,
        gmailRefreshToken: data.gmailRefreshToken,
        gmailAccessToken: data.gmailAccessToken,
        gmailTokenExpiry: data.gmailTokenExpiry,
        gmailAppPassword: null,
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserGmailTokens(userId: number, gmailAccessToken: string, gmailTokenExpiry: Date): Promise<void> {
    await db.update(users)
      .set({ gmailAccessToken, gmailTokenExpiry })
      .where(eq(users.id, userId));
  }

  async clearUserGmailOAuth(userId: number): Promise<void> {
    await db.update(users)
      .set({
        gmailAddress: null,
        gmailAppPassword: null,
        gmailRefreshToken: null,
        gmailAccessToken: null,
        gmailTokenExpiry: null,
      })
      .where(eq(users.id, userId));
  }

  async createBossNotification(notification: InsertBossNotification): Promise<BossNotification> {
    const [created] = await db.insert(bossNotifications).values(notification).returning();
    return created;
  }

  async markBossNotificationNotified(id: number): Promise<void> {
    await db.update(bossNotifications).set({ adminNotified: true }).where(eq(bossNotifications.id, id));
  }

  async getBossNotifications(userId: number, limit: number = 50): Promise<BossNotification[]> {
    return db.select().from(bossNotifications)
      .where(eq(bossNotifications.userId, userId))
      .orderBy(desc(bossNotifications.createdAt))
      .limit(limit);
  }

  async createOwnerNotification(notification: InsertBossNotification): Promise<BossNotification> {
    return this.createBossNotification(notification);
  }

  async markOwnerNotificationNotified(id: number): Promise<void> {
    return this.markBossNotificationNotified(id);
  }

  async getOwnerNotifications(userId: number, limit: number = 50): Promise<BossNotification[]> {
    return this.getBossNotifications(userId, limit);
  }

  async getSocialAccounts(userId: number): Promise<SocialAccount[]> {
    return db.select().from(socialAccounts)
      .where(eq(socialAccounts.userId, userId))
      .orderBy(socialAccounts.platform);
  }

  async addSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [created] = await db.insert(socialAccounts).values(account).returning();
    return created;
  }

  async updateSocialAccount(id: number, userId: number, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined> {
    const [updated] = await db.update(socialAccounts)
      .set(updates)
      .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSocialAccount(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db.delete(socialAccounts)
      .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)))
      .returning();
    return !!deleted;
  }

  async getSocialAccountById(id: number, userId: number): Promise<SocialAccount | undefined> {
    const [account] = await db.select().from(socialAccounts)
      .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
    return account;
  }

  async getShippingProviders(userId: number): Promise<ShippingProvider[]> {
    return db.select().from(shippingProviders).where(eq(shippingProviders.userId, userId)).orderBy(desc(shippingProviders.createdAt));
  }

  async addShippingProvider(provider: InsertShippingProvider): Promise<ShippingProvider> {
    const [created] = await db.insert(shippingProviders).values(provider).returning();
    return created;
  }

  async updateShippingProvider(id: number, userId: number, updates: Partial<Pick<ShippingProvider, "apiKey" | "customerCode" | "username" | "password" | "accountNumber" | "siteId" | "status">>): Promise<ShippingProvider | undefined> {
    const [updated] = await db.update(shippingProviders).set(updates).where(and(eq(shippingProviders.id, id), eq(shippingProviders.userId, userId))).returning();
    return updated;
  }

  async deleteShippingProvider(id: number, userId: number): Promise<boolean> {
    const [deleted] = await db.delete(shippingProviders).where(and(eq(shippingProviders.id, id), eq(shippingProviders.userId, userId))).returning();
    return !!deleted;
  }

  async getWhatsappConfig(userId: number): Promise<WhatsappConfig | undefined> {
    const [config] = await db.select().from(whatsappConfig).where(eq(whatsappConfig.userId, userId));
    return config;
  }

  async saveWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    const [created] = await db.insert(whatsappConfig).values(config)
      .onConflictDoUpdate({
        target: whatsappConfig.userId,
        set: {
          phoneNumberId: config.phoneNumberId,
          businessAccountId: config.businessAccountId,
          accessToken: config.accessToken,
          verifyToken: config.verifyToken,
          displayName: config.displayName,
          status: config.status || "active",
        },
      })
      .returning();
    return created;
  }

  async deleteWhatsappConfig(userId: number): Promise<boolean> {
    const [deleted] = await db.delete(whatsappConfig).where(eq(whatsappConfig.userId, userId)).returning();
    return !!deleted;
  }

  async getWhatsappConfigByVerifyToken(verifyToken: string): Promise<WhatsappConfig | undefined> {
    const [config] = await db.select().from(whatsappConfig).where(eq(whatsappConfig.verifyToken, verifyToken));
    return config;
  }

  async getWhatsappConfigByPhoneNumberId(phoneNumberId: string): Promise<WhatsappConfig | undefined> {
    const [config] = await db.select().from(whatsappConfig).where(eq(whatsappConfig.phoneNumberId, phoneNumberId));
    return config;
  }

  async saveWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [created] = await db.insert(whatsappMessages).values(message).returning();
    return created;
  }

  async getWhatsappMessages(userId: number, filters?: { direction?: string; agentType?: string; limit?: number }): Promise<WhatsappMessage[]> {
    const conditions = [eq(whatsappMessages.userId, userId)];
    if (filters?.direction) conditions.push(eq(whatsappMessages.direction, filters.direction as "inbound" | "outbound"));
    if (filters?.agentType) conditions.push(eq(whatsappMessages.agentType, filters.agentType));
    return db.select().from(whatsappMessages)
      .where(and(...conditions))
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(filters?.limit || 50);
  }

  async updateWhatsappMessageStatus(whatsappMessageId: string, status: string): Promise<void> {
    await db.update(whatsappMessages)
      .set({ status: status as "sent" | "delivered" | "read" | "failed" | "received" })
      .where(eq(whatsappMessages.whatsappMessageId, whatsappMessageId));
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async getGuardrailLogs(filters?: { agentType?: string; ruleType?: string; limit?: number; from?: Date; to?: Date }): Promise<GuardrailLog[]> {
    const conditions = [];
    if (filters?.agentType) conditions.push(eq(guardrailLogs.agentType, filters.agentType));
    if (filters?.ruleType) conditions.push(eq(guardrailLogs.ruleType, filters.ruleType));
    if (filters?.from) conditions.push(gte(guardrailLogs.createdAt, filters.from));
    if (filters?.to) conditions.push(lte(guardrailLogs.createdAt, filters.to));

    const query = db.select().from(guardrailLogs);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(guardrailLogs.createdAt)).limit(filters?.limit || 100);
    }
    return query.orderBy(desc(guardrailLogs.createdAt)).limit(filters?.limit || 100);
  }

  async createScheduledPost(post: InsertScheduledPost): Promise<ScheduledPost> {
    const [created] = await db.insert(scheduledPosts).values(post).returning();
    return created;
  }

  async getScheduledPosts(userId: number): Promise<ScheduledPost[]> {
    return db.select().from(scheduledPosts)
      .where(eq(scheduledPosts.userId, userId))
      .orderBy(desc(scheduledPosts.createdAt));
  }

  async getPendingScheduledPosts(): Promise<ScheduledPost[]> {
    return db.select().from(scheduledPosts)
      .where(and(
        eq(scheduledPosts.status, "pending"),
        lte(scheduledPosts.scheduledAt, new Date())
      ))
      .orderBy(scheduledPosts.scheduledAt);
  }

  async updateScheduledPost(id: number, updates: Partial<ScheduledPost>): Promise<ScheduledPost | undefined> {
    const [updated] = await db.update(scheduledPosts)
      .set(updates)
      .where(eq(scheduledPosts.id, id))
      .returning();
    return updated;
  }

  async cancelScheduledPost(id: number, userId: number): Promise<boolean> {
    const [updated] = await db.update(scheduledPosts)
      .set({ status: "cancelled" })
      .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.userId, userId), eq(scheduledPosts.status, "pending")))
      .returning();
    return !!updated;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async getAgentLimits(agentType?: string, userId?: number | null): Promise<AgentLimit[]> {
    const conditions = [];
    if (agentType) conditions.push(eq(agentLimits.agentType, agentType));
    if (userId !== undefined && userId !== null) {
      conditions.push(eq(agentLimits.userId, userId));
    }
    if (conditions.length > 0) {
      return db.select().from(agentLimits).where(and(...conditions)).orderBy(agentLimits.agentType, agentLimits.period);
    }
    return db.select().from(agentLimits).orderBy(agentLimits.agentType, agentLimits.period);
  }

  async upsertAgentLimit(limit: InsertAgentLimit): Promise<AgentLimit> {
    const conditions = [
      eq(agentLimits.agentType, limit.agentType),
      eq(agentLimits.period, limit.period as "daily" | "weekly" | "monthly"),
    ];
    if (limit.userId) {
      conditions.push(eq(agentLimits.userId, limit.userId));
    } else {
      conditions.push(sql`${agentLimits.userId} IS NULL`);
    }
    const existing = await db.select().from(agentLimits).where(and(...conditions));
    if (existing.length > 0) {
      const [updated] = await db.update(agentLimits)
        .set({ tokenLimit: limit.tokenLimit, messageLimit: limit.messageLimit, isActive: limit.isActive, updatedAt: new Date() })
        .where(eq(agentLimits.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(agentLimits).values({ ...limit, updatedAt: new Date() }).returning();
    return created;
  }

  async deleteAgentLimit(id: number): Promise<boolean> {
    const [deleted] = await db.delete(agentLimits).where(eq(agentLimits.id, id)).returning();
    return !!deleted;
  }

  async getTokenUsageByPeriod(userId: number | null, agentType: string, period: "daily" | "weekly" | "monthly"): Promise<{ tokens: number; messages: number }> {
    const now = new Date();
    let startDate: Date;
    if (period === "daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "weekly") {
      const day = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const conditions = [
      eq(tokenUsage.agentType, agentType),
      gte(tokenUsage.createdAt, startDate),
    ];
    if (userId) {
      conditions.push(eq(tokenUsage.userId, userId));
    }

    const result = await db
      .select({
        tokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)`,
        messages: sql<number>`COUNT(*)`,
      })
      .from(tokenUsage)
      .where(and(...conditions));

    return {
      tokens: Number(result[0]?.tokens || 0),
      messages: Number(result[0]?.messages || 0),
    };
  }

  async getUsageSummaryByPeriod(agentType: string, period: "daily" | "weekly" | "monthly"): Promise<{ tokens: number; messages: number }> {
    return this.getTokenUsageByPeriod(null, agentType, period);
  }

  async getEscalationRules(): Promise<EscalationRule[]> {
    return db.select().from(escalationRules).orderBy(escalationRules.id);
  }

  async getActiveEscalationRules(): Promise<EscalationRule[]> {
    return db.select().from(escalationRules).where(eq(escalationRules.isActive, true));
  }

  async upsertEscalationRule(rule: InsertEscalationRule): Promise<EscalationRule> {
    const [created] = await db.insert(escalationRules).values(rule).returning();
    return created;
  }

  async updateEscalationRule(id: number, updates: Partial<InsertEscalationRule>): Promise<EscalationRule | undefined> {
    const [updated] = await db.update(escalationRules).set({ ...updates, updatedAt: new Date() }).where(eq(escalationRules.id, id)).returning();
    return updated;
  }

  async deleteEscalationRule(id: number): Promise<boolean> {
    const [deleted] = await db.delete(escalationRules).where(eq(escalationRules.id, id)).returning();
    return !!deleted;
  }

  async createEscalation(escalation: InsertEscalation): Promise<Escalation> {
    const [created] = await db.insert(escalations).values(escalation).returning();
    return created;
  }

  async getEscalations(filters?: { status?: string; userId?: number }): Promise<Escalation[]> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(escalations.status, filters.status));
    if (filters?.userId) conditions.push(eq(escalations.userId, filters.userId));
    return db.select().from(escalations).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(escalations.createdAt));
  }

  async getEscalationById(id: number): Promise<Escalation | undefined> {
    const [esc] = await db.select().from(escalations).where(eq(escalations.id, id));
    return esc;
  }

  async getEscalationByToken(token: string): Promise<Escalation | undefined> {
    const [esc] = await db.select().from(escalations).where(eq(escalations.uniqueToken, token));
    return esc;
  }

  async getActiveEscalationForUser(userId: number, agentType: string): Promise<Escalation | undefined> {
    const [esc] = await db.select().from(escalations).where(
      and(
        eq(escalations.userId, userId),
        eq(escalations.agentType, agentType),
        sql`${escalations.status} IN ('pending', 'admin_joined')`
      )
    ).orderBy(desc(escalations.createdAt)).limit(1);
    return esc;
  }

  async updateEscalationStatus(id: number, status: string, resolvedAt?: Date): Promise<Escalation | undefined> {
    const updates: any = { status };
    if (resolvedAt) updates.resolvedAt = resolvedAt;
    const [updated] = await db.update(escalations).set(updates).where(eq(escalations.id, id)).returning();
    return updated;
  }

  async joinEscalation(id: number): Promise<Escalation | undefined> {
    const [updated] = await db.update(escalations).set({ status: "admin_joined", adminJoinedAt: new Date() }).where(eq(escalations.id, id)).returning();
    return updated;
  }

  async createEscalationMessage(msg: InsertEscalationMessage): Promise<EscalationMessage> {
    const [created] = await db.insert(escalationMessages).values(msg).returning();
    return created;
  }

  async getEscalationMessages(escalationId: number, after?: Date): Promise<EscalationMessage[]> {
    const conditions = [eq(escalationMessages.escalationId, escalationId)];
    if (after) conditions.push(gte(escalationMessages.createdAt, after));
    return db.select().from(escalationMessages).where(and(...conditions)).orderBy(escalationMessages.createdAt);
  }

  async getAgentInstruction(agentType: string): Promise<AgentInstruction | undefined> {
    const [row] = await db.select().from(agentInstructions).where(eq(agentInstructions.agentType, agentType));
    return row;
  }

  async getAllAgentInstructions(): Promise<AgentInstruction[]> {
    return db.select().from(agentInstructions).orderBy(agentInstructions.agentType);
  }

  async upsertAgentInstruction(agentType: string, instructions: string): Promise<AgentInstruction> {
    const [row] = await db.insert(agentInstructions)
      .values({ agentType, instructions })
      .onConflictDoUpdate({ target: agentInstructions.agentType, set: { instructions, updatedAt: new Date() } })
      .returning();
    return row;
  }

  async getGlobalInstruction(): Promise<GlobalAgentInstruction | undefined> {
    const [row] = await db.select().from(globalAgentInstructions).limit(1);
    return row;
  }

  async upsertGlobalInstruction(instructions: string): Promise<GlobalAgentInstruction> {
    const existing = await this.getGlobalInstruction();
    if (existing) {
      const [updated] = await db.update(globalAgentInstructions).set({ instructions, updatedAt: new Date() }).where(eq(globalAgentInstructions.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(globalAgentInstructions).values({ instructions }).returning();
    return created;
  }

  async getCrmDocuments(userId: number): Promise<CrmDocument[]> {
    return db.select().from(crmDocuments).where(eq(crmDocuments.userId, userId)).orderBy(desc(crmDocuments.uploadedAt));
  }

  async getCrmDocumentById(id: number, userId: number): Promise<CrmDocument | undefined> {
    const [doc] = await db.select().from(crmDocuments).where(and(eq(crmDocuments.id, id), eq(crmDocuments.userId, userId)));
    return doc;
  }

  async createCrmDocument(doc: InsertCrmDocument): Promise<CrmDocument> {
    const [created] = await db.insert(crmDocuments).values(doc).returning();
    return created;
  }

  async deleteCrmDocument(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(crmDocuments).where(and(eq(crmDocuments.id, id), eq(crmDocuments.userId, userId))).returning();
    return result.length > 0;
  }

  async createConsentLog(log: InsertConsentLog): Promise<ConsentLog> {
    const [created] = await db.insert(consentLogs).values(log).returning();
    return created;
  }

  async getConsentLogs(userId: number): Promise<ConsentLog[]> {
    return db.select().from(consentLogs).where(eq(consentLogs.userId, userId)).orderBy(desc(consentLogs.createdAt));
  }

  async getConsentStats(): Promise<{ consentType: string; granted: number; revoked: number; total: number }[]> {
    const result = await db.select({
      consentType: consentLogs.consentType,
      granted: sql<number>`count(*) filter (where ${consentLogs.granted} = true)`.as("granted"),
      revoked: sql<number>`count(*) filter (where ${consentLogs.granted} = false)`.as("revoked"),
      total: sql<number>`count(*)`.as("total"),
    }).from(consentLogs).groupBy(consentLogs.consentType);
    return result;
  }

  async updateUserConsent(userId: number, updates: { cookieConsent?: boolean; dataProcessingConsent?: boolean }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return updated;
  }

  async createPageView(pv: InsertPageView): Promise<PageView> {
    const [created] = await db.insert(pageViews).values(pv).returning();
    return created;
  }

  async createUserEvent(ev: InsertUserEvent): Promise<UserEvent> {
    const [created] = await db.insert(userEvents).values(ev).returning();
    return created;
  }

  async getAnalyticsSummary(period: "day" | "week" | "month"): Promise<any> {
    const intervalMap = { day: "1 day", week: "7 days", month: "30 days" };
    const interval = intervalMap[period];

    const activeUsersResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int as count FROM page_views
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)} AND user_id IS NOT NULL
    `);

    const pageViewsResult = await db.execute(sql`
      SELECT path, COUNT(*)::int as views, COUNT(DISTINCT user_id)::int as unique_users
      FROM page_views
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
      GROUP BY path ORDER BY views DESC LIMIT 20
    `);

    const topEventsResult = await db.execute(sql`
      SELECT event_name, event_category, COUNT(*)::int as count
      FROM user_events
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
      GROUP BY event_name, event_category ORDER BY count DESC LIMIT 20
    `);

    const agentUsageResult = await db.execute(sql`
      SELECT
        ue.metadata->>'agentType' as agent_type,
        COUNT(*)::int as event_count,
        COUNT(DISTINCT ue.user_id)::int as unique_users
      FROM user_events ue
      WHERE ue.created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        AND ue.event_category = 'agent'
      GROUP BY ue.metadata->>'agentType'
      ORDER BY event_count DESC
    `);

    const dailyActiveResult = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT user_id)::int as active_users,
        COUNT(*)::int as total_views
      FROM page_views
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)} AND user_id IS NOT NULL
      GROUP BY DATE(created_at) ORDER BY date DESC
    `);

    const conversionResult = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}) as new_users,
        (SELECT COUNT(DISTINCT user_id)::int FROM rentals WHERE started_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}) as users_with_rentals
    `);

    const totalPageViews = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM page_views
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);

    const totalEvents = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM user_events
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);

    const userFlowResult = await db.execute(sql`
      WITH ordered_views AS (
        SELECT
          user_id,
          path,
          LAG(path) OVER (PARTITION BY user_id ORDER BY created_at) as prev_path
        FROM page_views
        WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
          AND user_id IS NOT NULL
      )
      SELECT
        prev_path as from_path,
        path as to_path,
        COUNT(*)::int as transitions
      FROM ordered_views
      WHERE prev_path IS NOT NULL AND prev_path != path
      GROUP BY prev_path, path
      ORDER BY transitions DESC
      LIMIT 15
    `);

    const avgSessionDuration = await db.execute(sql`
      SELECT
        ROUND(AVG(duration))::int as avg_duration
      FROM page_views
      WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        AND duration IS NOT NULL AND duration > 0
    `);

    return {
      activeUsers: activeUsersResult.rows[0]?.count || 0,
      totalPageViews: totalPageViews.rows[0]?.count || 0,
      totalEvents: totalEvents.rows[0]?.count || 0,
      popularPages: pageViewsResult.rows,
      topEvents: topEventsResult.rows,
      agentUsage: agentUsageResult.rows,
      dailyActive: dailyActiveResult.rows,
      conversion: conversionResult.rows[0] || { new_users: 0, users_with_rentals: 0 },
      userFlows: userFlowResult.rows,
      avgSessionDuration: avgSessionDuration.rows[0]?.avg_duration || 0,
    };
  }

  async deleteUserAndData(userId: number): Promise<boolean> {
    try {
      await db.delete(feedback).where(eq(feedback.userId, userId));
      await db.delete(pageViews).where(eq(pageViews.userId, userId));
      await db.delete(userEvents).where(eq(userEvents.userId, userId));
      await db.delete(consentLogs).where(eq(consentLogs.userId, userId));
      await db.delete(crmDocuments).where(eq(crmDocuments.userId, userId));
      await db.delete(securityEvents).where(eq(securityEvents.userId, userId));
      await db.delete(agentActions).where(eq(agentActions.userId, userId));
      await db.delete(agentLimits).where(eq(agentLimits.userId, userId));
      await db.delete(escalationMessages).where(
        sql`${escalationMessages.escalationId} IN (SELECT id FROM escalations WHERE user_id = ${userId})`
      );
      await db.delete(escalations).where(eq(escalations.userId, userId));
      await db.delete(whatsappMessages).where(eq(whatsappMessages.userId, userId));
      await db.delete(whatsappConfig).where(eq(whatsappConfig.userId, userId));
      await db.delete(scheduledPosts).where(eq(scheduledPosts.userId, userId));
      await db.delete(guardrailLogs).where(eq(guardrailLogs.userId, userId));
      await db.delete(bossNotifications).where(eq(bossNotifications.userId, userId));
      await db.delete(shippingProviders).where(eq(shippingProviders.userId, userId));
      await db.delete(socialAccounts).where(eq(socialAccounts.userId, userId));
      await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
      await db.delete(agentTasks).where(eq(agentTasks.userId, userId));
      await db.delete(emailCampaigns).where(eq(emailCampaigns.userId, userId));
      await db.delete(leads).where(eq(leads.userId, userId));
      await db.delete(supportTickets).where(eq(supportTickets.userId, userId));
      await db.delete(tokenUsage).where(eq(tokenUsage.userId, userId));
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
      await db.delete(conversations).where(eq(conversations.userId, userId));
      await db.delete(rentals).where(eq(rentals.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      return true;
    } catch (err) {
      console.error("deleteUserAndData failed:", err);
      return false;
    }
  }

  async createFeedback(fb: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values(fb).returning();
    return created;
  }

  async getLastNpsByUser(userId: number): Promise<Feedback | undefined> {
    const [last] = await db.select().from(feedback)
      .where(and(eq(feedback.userId, userId), eq(feedback.type, "nps")))
      .orderBy(desc(feedback.createdAt))
      .limit(1);
    return last;
  }

  async getFeedbackList(filters?: { type?: "nps" | "chat_rating" | "general"; limit?: number; offset?: number }): Promise<Feedback[]> {
    const conditions = [];
    if (filters?.type) conditions.push(eq(feedback.type, filters.type));
    const query = conditions.length > 0
      ? db.select().from(feedback).where(and(...conditions))
      : db.select().from(feedback);
    return query.orderBy(desc(feedback.createdAt)).limit(filters?.limit || 50).offset(filters?.offset || 0);
  }

  async getFeedbackSummary(): Promise<{
    npsAvg: number; npsCount: number;
    chatRatingAvg: number; chatRatingCount: number;
    generalCount: number;
    categoryDist: { category: string; count: number }[];
    agentSatisfaction: { agentType: string; avgScore: number; count: number }[];
    npsTrend: { month: string; avg: number; count: number }[];
  }> {
    const npsResult = await db.execute(sql`
      SELECT COALESCE(AVG(score), 0)::float as avg, COUNT(*)::int as count
      FROM feedback WHERE type = 'nps' AND score IS NOT NULL
    `);
    const chatResult = await db.execute(sql`
      SELECT COALESCE(AVG(score), 0)::float as avg, COUNT(*)::int as count
      FROM feedback WHERE type = 'chat_rating' AND score IS NOT NULL
    `);
    const generalResult = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM feedback WHERE type = 'general'
    `);
    const categoryResult = await db.execute(sql`
      SELECT category, COUNT(*)::int as count FROM feedback
      WHERE type = 'general' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC
    `);
    const agentResult = await db.execute(sql`
      SELECT agent_type, AVG(score)::float as avg_score, COUNT(*)::int as count
      FROM feedback WHERE type = 'chat_rating' AND agent_type IS NOT NULL AND score IS NOT NULL
      GROUP BY agent_type ORDER BY avg_score DESC
    `);
    const trendResult = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, AVG(score)::float as avg, COUNT(*)::int as count
      FROM feedback WHERE type = 'nps' AND score IS NOT NULL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC LIMIT 12
    `);
    return {
      npsAvg: (npsResult.rows[0] as Record<string, number>)?.avg || 0,
      npsCount: (npsResult.rows[0] as Record<string, number>)?.count || 0,
      chatRatingAvg: (chatResult.rows[0] as Record<string, number>)?.avg || 0,
      chatRatingCount: (chatResult.rows[0] as Record<string, number>)?.count || 0,
      generalCount: (generalResult.rows[0] as Record<string, number>)?.count || 0,
      categoryDist: categoryResult.rows as { category: string; count: number }[],
      agentSatisfaction: agentResult.rows.map((r: Record<string, unknown>) => ({
        agentType: r.agent_type as string,
        avgScore: r.avg_score as number,
        count: r.count as number,
      })),
      npsTrend: trendResult.rows as { month: string; avg: number; count: number }[],
    };
  }
  async createRexContact(data: InsertRexContact): Promise<RexContact> {
    const [contact] = await db.insert(rexContacts).values(data).returning();
    return contact;
  }

  async getRexContact(id: string, userId: number): Promise<RexContact | undefined> {
    const [contact] = await db.select().from(rexContacts).where(and(eq(rexContacts.id, id), eq(rexContacts.userId, userId)));
    return contact;
  }

  async getRexContactsByUser(userId: number): Promise<RexContact[]> {
    return db.select().from(rexContacts).where(eq(rexContacts.userId, userId)).orderBy(desc(rexContacts.createdAt));
  }

  async searchRexContacts(userId: number, filters: { query?: string; segment?: CustomerSegmentValue; source?: LeadSourceValue; minScore?: number; tags?: string[]; limit?: number; offset?: number }): Promise<RexContact[]> {
    const conditions = [eq(rexContacts.userId, userId)];
    if (filters.segment && CUSTOMER_SEGMENT_VALUES.includes(filters.segment)) conditions.push(eq(rexContacts.segment, filters.segment));
    if (filters.source && LEAD_SOURCE_VALUES.includes(filters.source)) conditions.push(eq(rexContacts.source, filters.source));
    if (filters.minScore) conditions.push(gte(rexContacts.leadScore, filters.minScore));
    if (filters.query) {
      conditions.push(sql`(${rexContacts.companyName} ILIKE ${'%' + filters.query + '%'} OR ${rexContacts.contactName} ILIKE ${'%' + filters.query + '%'} OR ${rexContacts.email} ILIKE ${'%' + filters.query + '%'} OR ${rexContacts.industry} ILIKE ${'%' + filters.query + '%'})`);
    }
    return db.select().from(rexContacts).where(and(...conditions)).orderBy(desc(rexContacts.leadScore)).limit(filters.limit || 50).offset(filters.offset || 0);
  }

  async updateRexContact(id: string, userId: number, data: Partial<InsertRexContact>): Promise<RexContact | undefined> {
    const [contact] = await db.update(rexContacts).set({ ...data, updatedAt: new Date() }).where(and(eq(rexContacts.id, id), eq(rexContacts.userId, userId))).returning();
    return contact;
  }

  async deleteRexContact(id: string, userId: number): Promise<boolean> {
    const result = await db.delete(rexContacts).where(and(eq(rexContacts.id, id), eq(rexContacts.userId, userId))).returning();
    return result.length > 0;
  }

  async createRexDeal(data: InsertRexDeal): Promise<RexDeal> {
    const [deal] = await db.insert(rexDeals).values(data).returning();
    await db.insert(rexStageHistory).values({
      dealId: deal.id,
      userId: data.userId,
      fromStage: null,
      toStage: data.stage || "new_lead",
      changedBy: "rex",
      notes: "Deal created",
    });
    return deal;
  }

  async getRexDeal(id: string, userId: number): Promise<RexDeal | undefined> {
    const [deal] = await db.select().from(rexDeals).where(and(eq(rexDeals.id, id), eq(rexDeals.userId, userId)));
    return deal;
  }

  async getRexDealsByUser(userId: number): Promise<RexDeal[]> {
    return db.select().from(rexDeals).where(eq(rexDeals.userId, userId)).orderBy(desc(rexDeals.createdAt));
  }

  async getRexDealsByContact(contactId: string, userId: number): Promise<RexDeal[]> {
    return db.select().from(rexDeals).where(and(eq(rexDeals.contactId, contactId), eq(rexDeals.userId, userId))).orderBy(desc(rexDeals.createdAt));
  }

  async searchRexDeals(userId: number, filters: { stage?: DealStageValue; minValue?: number; contactId?: string; limit?: number; offset?: number }): Promise<RexDeal[]> {
    const conditions = [eq(rexDeals.userId, userId)];
    if (filters.stage && DEAL_STAGE_VALUES.includes(filters.stage)) conditions.push(eq(rexDeals.stage, filters.stage));
    if (filters.minValue) conditions.push(gte(rexDeals.value, String(filters.minValue)));
    if (filters.contactId) conditions.push(eq(rexDeals.contactId, filters.contactId));
    return db.select().from(rexDeals).where(and(...conditions)).orderBy(desc(rexDeals.createdAt)).limit(filters.limit || 50).offset(filters.offset || 0);
  }

  async updateRexDeal(id: string, userId: number, data: Partial<InsertRexDeal>): Promise<RexDeal | undefined> {
    const [deal] = await db.update(rexDeals).set({ ...data, updatedAt: new Date() }).where(and(eq(rexDeals.id, id), eq(rexDeals.userId, userId))).returning();
    return deal;
  }

  async updateRexDealStage(id: string, userId: number, newStage: DealStageValue, notes?: string): Promise<RexDeal | undefined> {
    const existing = await this.getRexDeal(id, userId);
    if (!existing) return undefined;

    const stageConfigs = await this.getRexStageConfig();
    const config = stageConfigs.find(c => c.stage === newStage);

    const [deal] = await db.update(rexDeals).set({
      stage: newStage,
      probability: config?.defaultProbability || existing.probability,
      stageEnteredAt: new Date(),
      updatedAt: new Date(),
      ...(newStage === "closed_won" ? { actualClose: new Date().toISOString().split("T")[0] } : {}),
      ...(newStage === "closed_lost" ? { actualClose: new Date().toISOString().split("T")[0] } : {}),
    }).where(and(eq(rexDeals.id, id), eq(rexDeals.userId, userId))).returning();

    await db.insert(rexStageHistory).values({
      dealId: id,
      userId,
      fromStage: existing.stage,
      toStage: newStage,
      changedBy: "rex",
      notes,
    });

    await db.insert(rexActivities).values({
      userId,
      contactId: existing.contactId,
      dealId: id,
      type: "stage_change",
      subject: `Stage: ${existing.stage} → ${newStage}`,
      body: notes,
      completedAt: new Date(),
      generatedBy: "rex",
    });

    return deal;
  }

  async getRexPipelineSummary(userId: number): Promise<{ stage: string; count: number; totalValue: number }[]> {
    const result = await db.execute(sql`
      SELECT stage, COUNT(*)::int as count, COALESCE(SUM(value), 0)::float as total_value
      FROM rex_deals WHERE user_id = ${userId}
      GROUP BY stage ORDER BY
        CASE stage
          WHEN 'new_lead' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'proposal_sent' THEN 4
          WHEN 'negotiation' THEN 5
          WHEN 'closed_won' THEN 6
          WHEN 'closed_lost' THEN 7
        END
    `);
    return result.rows.map((r: Record<string, unknown>) => ({
      stage: r.stage as string,
      count: r.count as number,
      totalValue: r.total_value as number,
    }));
  }

  async getRexConversionFunnel(userId: number): Promise<{ stage: string; count: number; dropoff: number }[]> {
    const pipeline = await this.getRexPipelineSummary(userId);
    const stageOrder: DealStageValue[] = ["new_lead", "contacted", "qualified", "proposal_sent", "negotiation", "closed_won"];
    const funnel: { stage: string; count: number; dropoff: number }[] = [];
    let prevCount = 0;
    for (const stage of stageOrder) {
      const found = pipeline.find(p => p.stage === stage);
      const cumulativeCount = pipeline
        .filter(p => stageOrder.indexOf(p.stage as DealStageValue) >= stageOrder.indexOf(stage))
        .reduce((s, p) => s + p.count, 0);
      const dropoff = prevCount > 0 ? Math.round((1 - cumulativeCount / prevCount) * 100) : 0;
      funnel.push({ stage, count: cumulativeCount, dropoff });
      prevCount = cumulativeCount || prevCount;
    }
    return funnel;
  }

  async createRexActivity(data: InsertRexActivity): Promise<RexActivity> {
    const [activity] = await db.insert(rexActivities).values(data).returning();
    await db.update(rexContacts).set({ lastContactedAt: new Date(), updatedAt: new Date() }).where(and(eq(rexContacts.id, data.contactId), eq(rexContacts.userId, data.userId)));
    return activity;
  }

  async getRexActivitiesByContact(contactId: string, userId: number): Promise<RexActivity[]> {
    return db.select().from(rexActivities).where(and(eq(rexActivities.contactId, contactId), eq(rexActivities.userId, userId))).orderBy(desc(rexActivities.createdAt));
  }

  async getRexActivities(userId: number, filters: { contactId?: string; dealId?: string; type?: ActivityTypeValue; limit?: number; offset?: number }): Promise<RexActivity[]> {
    const conditions = [eq(rexActivities.userId, userId)];
    if (filters.contactId) conditions.push(eq(rexActivities.contactId, filters.contactId));
    if (filters.dealId) conditions.push(eq(rexActivities.dealId, filters.dealId));
    if (filters.type && ACTIVITY_TYPE_VALUES.includes(filters.type)) conditions.push(eq(rexActivities.type, filters.type));
    return db.select().from(rexActivities).where(and(...conditions)).orderBy(desc(rexActivities.createdAt)).limit(filters.limit || 50).offset(filters.offset || 0);
  }

  async createRexSequence(data: InsertRexSequence): Promise<RexSequence> {
    const [sequence] = await db.insert(rexSequences).values(data).returning();
    return sequence;
  }

  async getRexSequences(userId: number, filters: { contactId?: string; status?: SequenceStatusValue; limit?: number }): Promise<RexSequence[]> {
    const conditions = [eq(rexSequences.userId, userId)];
    if (filters.contactId) conditions.push(eq(rexSequences.contactId, filters.contactId));
    if (filters.status && SEQUENCE_STATUS_VALUES.includes(filters.status)) conditions.push(eq(rexSequences.status, filters.status));
    return db.select().from(rexSequences).where(and(...conditions)).orderBy(desc(rexSequences.createdAt)).limit(filters.limit || 50);
  }

  async getActiveSequences(userId: number): Promise<RexSequence[]> {
    return db.select().from(rexSequences).where(and(eq(rexSequences.userId, userId), eq(rexSequences.status, "active"))).orderBy(desc(rexSequences.createdAt));
  }

  async updateRexSequence(id: string, userId: number, data: Partial<InsertRexSequence>): Promise<RexSequence | undefined> {
    const [sequence] = await db.update(rexSequences).set({ ...data, updatedAt: new Date() }).where(and(eq(rexSequences.id, id), eq(rexSequences.userId, userId))).returning();
    return sequence;
  }

  async getRexStageConfig(): Promise<RexStageConfig[]> {
    return db.select().from(rexStageConfig);
  }

  async createJobPosting(data: InsertJobPosting): Promise<JobPosting> {
    const [created] = await db.insert(jobPostings).values(data).returning();
    return created;
  }

  async getJobPostings(userId: number, status?: string): Promise<JobPosting[]> {
    if (status) {
      return db.select().from(jobPostings).where(and(eq(jobPostings.userId, userId), eq(jobPostings.status, status))).orderBy(desc(jobPostings.createdAt));
    }
    return db.select().from(jobPostings).where(eq(jobPostings.userId, userId)).orderBy(desc(jobPostings.createdAt));
  }

  async getJobPostingById(id: number, userId: number): Promise<JobPosting | undefined> {
    const [posting] = await db.select().from(jobPostings).where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId)));
    return posting;
  }

  async getJobPostingByPostingId(postingId: string, userId: number): Promise<JobPosting | undefined> {
    const [posting] = await db.select().from(jobPostings).where(and(eq(jobPostings.postingId, postingId), eq(jobPostings.userId, userId)));
    return posting;
  }

  async updateJobPosting(id: number, userId: number, updates: Partial<InsertJobPosting>): Promise<JobPosting | undefined> {
    const [updated] = await db.update(jobPostings).set({ ...updates, updatedAt: new Date() }).where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId))).returning();
    return updated;
  }

  async createCandidate(data: InsertCandidate): Promise<Candidate> {
    const [created] = await db.insert(candidates).values(data).returning();
    return created;
  }

  async getCandidates(userId: number): Promise<Candidate[]> {
    return db.select().from(candidates).where(eq(candidates.userId, userId)).orderBy(desc(candidates.createdAt));
  }

  async getCandidateById(id: number, userId: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, userId)));
    return candidate;
  }

  async updateCandidate(id: number, userId: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [updated] = await db.update(candidates).set(updates).where(and(eq(candidates.id, id), eq(candidates.userId, userId))).returning();
    return updated;
  }

  async createApplication(data: InsertApplication): Promise<Application> {
    const [created] = await db.insert(applications).values(data).returning();
    return created;
  }

  async getApplications(userId: number, filters?: { jobPostingId?: number; status?: string }): Promise<Application[]> {
    const conditions = [eq(applications.userId, userId)];
    if (filters?.jobPostingId) conditions.push(eq(applications.jobPostingId, filters.jobPostingId));
    if (filters?.status) conditions.push(eq(applications.status, filters.status));
    return db.select().from(applications).where(and(...conditions)).orderBy(desc(applications.createdAt));
  }

  async getApplicationById(id: number, userId: number): Promise<Application | undefined> {
    const [app] = await db.select().from(applications).where(and(eq(applications.id, id), eq(applications.userId, userId)));
    return app;
  }

  async updateApplicationStatus(id: number, userId: number, status: string, notes?: string, interviewDate?: Date): Promise<Application | undefined> {
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (notes !== undefined) updates.notes = notes;
    if (interviewDate !== undefined) updates.interviewDate = interviewDate;
    const [updated] = await db.update(applications).set(updates).where(and(eq(applications.id, id), eq(applications.userId, userId))).returning();
    return updated;
  }

  async updateApplicationScore(id: number, userId: number, score: number): Promise<Application | undefined> {
    const [updated] = await db.update(applications).set({ score, updatedAt: new Date() }).where(and(eq(applications.id, id), eq(applications.userId, userId))).returning();
    return updated;
  }

  async getPipelineSummary(userId: number): Promise<{ status: string; count: number }[]> {
    const result = await db.execute(
      sql`SELECT status, COUNT(*)::int as count FROM applications WHERE user_id = ${userId} GROUP BY status ORDER BY status`
    );
    return result.rows as { status: string; count: number }[];
  }

  async getCandidatesWithScoresForJob(jobPostingId: number, userId: number): Promise<(Application & { candidate: Candidate })[]> {
    const apps = await db.select().from(applications).where(and(eq(applications.jobPostingId, jobPostingId), eq(applications.userId, userId))).orderBy(desc(applications.score));
    const result: (Application & { candidate: Candidate })[] = [];
    for (const app of apps) {
      const [candidate] = await db.select().from(candidates).where(eq(candidates.id, app.candidateId));
      if (candidate) {
        result.push({ ...app, candidate });
      }
    }
    return result;
  }

  async deleteJobPosting(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(jobPostings).where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId))).returning();
    return result.length > 0;
  }

  async deleteCandidate(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, userId))).returning();
    return result.length > 0;
  }

  async deleteApplication(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(applications).where(and(eq(applications.id, id), eq(applications.userId, userId))).returning();
    return result.length > 0;
  }

  async createScheduledTask(data: InsertScheduledTask): Promise<ScheduledTask> {
    const [task] = await db.insert(scheduledTasks).values(data).returning();
    return task;
  }

  async getScheduledTasks(userId: number): Promise<ScheduledTask[]> {
    return db.select().from(scheduledTasks).where(eq(scheduledTasks.userId, userId)).orderBy(desc(scheduledTasks.createdAt));
  }

  async getScheduledTaskById(id: number, userId: number): Promise<ScheduledTask | undefined> {
    const [task] = await db.select().from(scheduledTasks).where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId)));
    return task;
  }

  async updateScheduledTask(id: number, userId: number, updates: Partial<InsertScheduledTask>): Promise<ScheduledTask | undefined> {
    const [task] = await db.update(scheduledTasks).set({ ...updates, updatedAt: new Date() }).where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId))).returning();
    return task;
  }

  async deleteScheduledTask(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(scheduledTasks).where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId))).returning();
    return result.length > 0;
  }

  async getActiveScheduledTasks(): Promise<ScheduledTask[]> {
    return db.select().from(scheduledTasks).where(eq(scheduledTasks.isActive, true));
  }

  async updateScheduledTaskRunInfo(id: number, updates: { lastRunAt: Date; nextRunAt?: Date; runCount?: number }): Promise<void> {
    await db.update(scheduledTasks).set({
      lastRunAt: updates.lastRunAt,
      ...(updates.nextRunAt && { nextRunAt: updates.nextRunAt }),
      ...(updates.runCount !== undefined && { runCount: updates.runCount }),
      updatedAt: new Date(),
    }).where(eq(scheduledTasks.id, id));
  }

  async createScheduledTaskRun(data: InsertScheduledTaskRun): Promise<ScheduledTaskRun> {
    const [run] = await db.insert(scheduledTaskRuns).values(data).returning();
    return run;
  }

  async getScheduledTaskRuns(taskId: number, userId: number, limit = 50): Promise<ScheduledTaskRun[]> {
    return db.select().from(scheduledTaskRuns).where(and(eq(scheduledTaskRuns.taskId, taskId), eq(scheduledTaskRuns.userId, userId))).orderBy(desc(scheduledTaskRuns.startedAt)).limit(limit);
  }

  async updateScheduledTaskRun(id: number, updates: { status: string; result?: string; error?: string; durationMs?: number; completedAt: Date }): Promise<void> {
    await db.update(scheduledTaskRuns).set(updates).where(eq(scheduledTaskRuns.id, id));
  }

  async createBoostSubscription(data: InsertBoostSubscription): Promise<BoostSubscription> {
    const [created] = await db.insert(boostSubscriptions).values(data).returning();
    return created;
  }

  async getActiveBoostSubscription(userId: number): Promise<BoostSubscription | undefined> {
    const [boost] = await db.select().from(boostSubscriptions).where(
      and(eq(boostSubscriptions.userId, userId), eq(boostSubscriptions.status, "active"))
    );
    return boost;
  }

  async getBoostSubscriptionByStripeId(stripeSubId: string): Promise<BoostSubscription | undefined> {
    const [boost] = await db.select().from(boostSubscriptions).where(
      eq(boostSubscriptions.stripeBoostSubId, stripeSubId)
    );
    return boost;
  }

  async updateBoostSubscription(id: number, updates: Partial<Pick<BoostSubscription, "status" | "stripeBoostSubId" | "expiresAt" | "boostPlan" | "maxParallelTasks">>): Promise<BoostSubscription | undefined> {
    const [updated] = await db.update(boostSubscriptions).set(updates).where(eq(boostSubscriptions.id, id)).returning();
    return updated;
  }

  async deactivateBoostSubscription(userId: number): Promise<void> {
    await db.update(boostSubscriptions).set({ status: "inactive" }).where(
      and(eq(boostSubscriptions.userId, userId), eq(boostSubscriptions.status, "active"))
    );
  }

  async updateConversationBoostStatus(conversationId: number, boostStatus: string): Promise<void> {
    await db.update(conversations).set({ boostStatus }).where(eq(conversations.id, conversationId));
  }

  async getActiveBoostConversations(userId: number, agentType?: string): Promise<ConversationRecord[]> {
    if (agentType) {
      return db.select().from(conversations).where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.agentType, agentType),
          eq(conversations.boostStatus, "running")
        )
      );
    }
    return db.select().from(conversations).where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.boostStatus, "running")
      )
    );
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(data).returning();
    return created;
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async getOrganizationsByUser(userId: number): Promise<Organization[]> {
    const members = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));
    if (members.length === 0) return [];
    const orgIds = members.map(m => m.organizationId);
    return db.select().from(organizations).where(inArray(organizations.id, orgIds));
  }

  async getOrganizationByOwner(ownerId: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId));
    return org;
  }

  async getOrganizationForUser(userId: number): Promise<Organization | undefined> {
    const ownerOrg = await this.getOrganizationByOwner(userId);
    if (ownerOrg) return ownerOrg;
    const [membership] = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
    if (!membership) return undefined;
    return this.getOrganizationById(membership.organizationId);
  }

  async updateOrganization(id: number, updates: Partial<Pick<Organization, "name" | "logoUrl">>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async deleteOrganization(id: number): Promise<boolean> {
    const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
    return result.length > 0;
  }

  async addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db.insert(organizationMembers).values(data).returning();
    return created;
  }

  async getOrganizationMembers(organizationId: number): Promise<(OrganizationMember & { user: { id: number; email: string; fullName: string; username: string } })[]> {
    const results = await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          username: users.username,
        },
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
    return results;
  }

  async getOrganizationMember(organizationId: number, userId: number): Promise<OrganizationMember | undefined> {
    const [member] = await db.select().from(organizationMembers).where(
      and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))
    );
    return member;
  }

  async updateMemberRole(organizationId: number, userId: number, role: OrgRole): Promise<OrganizationMember | undefined> {
    const [updated] = await db.update(organizationMembers)
      .set({ role })
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)))
      .returning();
    return updated;
  }

  async removeOrganizationMember(organizationId: number, userId: number): Promise<boolean> {
    const result = await db.delete(organizationMembers).where(
      and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))
    ).returning();
    return result.length > 0;
  }

  async getUserOrganizationRole(userId: number, organizationId: number): Promise<OrgRole | null> {
    const [member] = await db.select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId)));
    return member ? member.role as OrgRole : null;
  }

  async createOrganizationInvite(data: InsertOrganizationInvite): Promise<OrganizationInvite> {
    const [created] = await db.insert(organizationInvites).values(data).returning();
    return created;
  }

  async getOrganizationInviteByToken(token: string): Promise<OrganizationInvite | undefined> {
    const [invite] = await db.select().from(organizationInvites).where(eq(organizationInvites.token, token));
    return invite;
  }

  async getOrganizationInvites(organizationId: number): Promise<OrganizationInvite[]> {
    return db.select().from(organizationInvites)
      .where(and(eq(organizationInvites.organizationId, organizationId), eq(organizationInvites.status, "pending")))
      .orderBy(desc(organizationInvites.createdAt));
  }

  async cancelOrganizationInvite(id: number, organizationId: number): Promise<boolean> {
    const result = await db.update(organizationInvites)
      .set({ status: "cancelled" })
      .where(and(eq(organizationInvites.id, id), eq(organizationInvites.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  async acceptOrganizationInvite(token: string, userId: number): Promise<{ success: boolean; organizationId?: number; error?: string }> {
    const [invite] = await db.select().from(organizationInvites).where(eq(organizationInvites.token, token));
    if (!invite) return { success: false, error: "Invite not found" };
    if (invite.status !== "pending") return { success: false, error: "Invite already used or cancelled" };
    if (new Date() > invite.expiresAt) return { success: false, error: "Invite has expired" };

    const existingMember = await this.getOrganizationMember(invite.organizationId, userId);
    if (existingMember) return { success: false, error: "Already a member of this organization" };

    await db.transaction(async (tx) => {
      await tx.insert(organizationMembers).values({
        organizationId: invite.organizationId,
        userId,
        role: invite.role as OrgRole,
      });
      await tx.update(organizationInvites).set({ status: "accepted" }).where(eq(organizationInvites.id, invite.id));
    });

    return { success: true, organizationId: invite.organizationId };
  }

  async getPendingInvitesByEmail(email: string): Promise<OrganizationInvite[]> {
    return db.select().from(organizationInvites).where(
      and(eq(organizationInvites.email, email), eq(organizationInvites.status, "pending"))
    );
  }

  async getOrgRentals(organizationId: number): Promise<Rental[]> {
    return db.select().from(rentals).where(eq(rentals.organizationId, organizationId));
  }

  async getOrgActiveRental(organizationId: number, agentType: string): Promise<Rental | undefined> {
    const [rental] = await db.select().from(rentals).where(
      and(eq(rentals.organizationId, organizationId), eq(rentals.agentType, agentType), eq(rentals.status, "active"))
    );
    return rental;
  }

  async transferOrganizationOwnership(organizationId: number, newOwnerId: number): Promise<void> {
    await db.update(organizations)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
  }

  async getOrgRexContacts(organizationId: number): Promise<RexContact[]> {
    return db.select().from(rexContacts).where(eq(rexContacts.organizationId, organizationId));
  }

  async getOrgCrmDocuments(organizationId: number): Promise<CrmDocument[]> {
    return db.select().from(crmDocuments).where(eq(crmDocuments.organizationId, organizationId));
  }

  async getOrgAgentDocuments(organizationId: number): Promise<AgentDocument[]> {
    return db.select().from(agentDocuments).where(eq(agentDocuments.organizationId, organizationId));
  }
}

export const storage = new DatabaseStorage();
