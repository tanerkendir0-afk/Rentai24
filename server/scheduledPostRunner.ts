import { storage } from "./storage";
import { publishToSocialMedia } from "./socialPostingService";

const CHECK_INTERVAL = 60 * 1000;
let isProcessing = false;

export function startScheduledPostRunner() {
  console.log("[ScheduledPostRunner] Started — checking every minute");

  setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const pendingPosts = await storage.getPendingScheduledPosts();
      if (pendingPosts.length === 0) return;

      console.log(`[ScheduledPostRunner] Found ${pendingPosts.length} pending post(s)`);

      for (const post of pendingPosts) {
        const claimed = await storage.updateScheduledPost(post.id, { status: "processing" });
        if (!claimed || claimed.status !== "processing") continue;

        try {
          if (!post.accountId) {
            await storage.updateScheduledPost(post.id, {
              status: "failed",
              errorMessage: "No social account linked to this scheduled post",
            });
            continue;
          }

          const account = await storage.getSocialAccountById(post.accountId, post.userId);
          if (!account) {
            await storage.updateScheduledPost(post.id, {
              status: "failed",
              errorMessage: "Linked social account not found or deleted",
            });
            continue;
          }

          if (account.accountType === "personal") {
            await storage.updateScheduledPost(post.id, {
              status: "reminder_sent",
              errorMessage: `Personal account — manual posting required. Content ready for @${account.username} on ${account.platform}.`,
            });

            await storage.createAgentAction({
              userId: post.userId,
              agentType: "social-media",
              actionType: "scheduled_post_reminder",
              description: `⏰ Scheduled post reminder: Time to post on ${account.platform} @${account.username}`,
              metadata: { postId: post.id, platform: account.platform, content: post.content?.substring(0, 100) },
            });

            try {
              const { createBossNotification } = await import("./bossNotificationService");
              if (typeof createBossNotification === "function") {
                await createBossNotification(post.userId, `⏰ Scheduled ${account.platform} post is ready to share! @${account.username}`, "scheduled_post_reminder");
              }
            } catch {}
            continue;
          }

          const fullContent = post.hashtags
            ? `${post.content}\n\n${post.hashtags}`
            : post.content;

          const result = await publishToSocialMedia(account, fullContent, post.imageUrl || undefined);

          if (result.success) {
            await storage.updateScheduledPost(post.id, {
              status: "published",
              publishedAt: new Date(),
            });

            await storage.createAgentAction({
              userId: post.userId,
              agentType: "social-media",
              actionType: "scheduled_post_published",
              description: `✅ Scheduled post published to ${account.platform} @${account.username}`,
              metadata: { postId: post.id, postUrl: result.postUrl, platform: account.platform },
            });

            console.log(`[ScheduledPostRunner] Published post #${post.id} to ${account.platform}`);
          } else {
            await storage.updateScheduledPost(post.id, {
              status: "failed",
              errorMessage: result.error || "Unknown error",
            });

            console.error(`[ScheduledPostRunner] Failed post #${post.id}: ${result.error}`);
          }
        } catch (err: any) {
          await storage.updateScheduledPost(post.id, {
            status: "failed",
            errorMessage: err.message || "Unexpected error",
          });
          console.error(`[ScheduledPostRunner] Error processing post #${post.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[ScheduledPostRunner] Check cycle error:", err.message);
    } finally {
      isProcessing = false;
    }
  }, CHECK_INTERVAL);
}
