import type { SocialAccount } from "@shared/schema";

interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("172.") || hostname === "[::1]") return false;
    return true;
  } catch {
    return false;
  }
}

export async function postToTwitter(
  account: SocialAccount,
  text: string,
  imageUrl?: string
): Promise<PostResult> {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = account;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { success: false, error: "Twitter API credentials are incomplete. Need API Key, API Secret, Access Token, and Access Token Secret." };
  }

  try {
    const oauthNonce = Math.random().toString(36).substring(2);
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString();

    let mediaId: string | undefined;
    if (imageUrl) {
      if (!isValidExternalUrl(imageUrl)) {
        return { success: false, error: "Invalid image URL. Only external HTTPS URLs are allowed." };
      }
      const imgResponse = await fetch(imageUrl);
      const imgBuffer = await imgResponse.arrayBuffer();
      const imgBase64 = Buffer.from(imgBuffer).toString("base64");

      const uploadParams = new URLSearchParams();
      uploadParams.set("media_data", imgBase64);

      const uploadAuth = generateOAuth1Header(
        "POST",
        "https://upload.twitter.com/1.1/media/upload.json",
        {},
        apiKey, apiSecret, accessToken, accessTokenSecret,
        oauthNonce, oauthTimestamp
      );

      const uploadRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { "Authorization": uploadAuth, "Content-Type": "application/x-www-form-urlencoded" },
        body: uploadParams.toString(),
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json() as any;
        mediaId = uploadData.media_id_string;
      }
    }

    const tweetBody: any = { text };
    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    const tweetAuth = generateOAuth1Header(
      "POST",
      "https://api.twitter.com/2/tweets",
      {},
      apiKey, apiSecret, accessToken, accessTokenSecret,
      Math.random().toString(36).substring(2),
      Math.floor(Date.now() / 1000).toString()
    );

    const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": tweetAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    if (!tweetRes.ok) {
      const errData = await tweetRes.text();
      return { success: false, error: `Twitter API error (${tweetRes.status}): ${errData}` };
    }

    const data = await tweetRes.json() as any;
    return {
      success: true,
      postId: data.data?.id,
      postUrl: `https://twitter.com/${account.username}/status/${data.data?.id}`,
    };
  } catch (err: any) {
    return { success: false, error: `Twitter posting failed: ${err.message}` };
  }
}

export async function postToInstagramBusiness(
  account: SocialAccount,
  caption: string,
  imageUrl: string
): Promise<PostResult> {
  const { accessToken, businessAccountId } = account;
  if (!accessToken || !businessAccountId) {
    return { success: false, error: "Instagram Business credentials incomplete. Need Meta Access Token and Instagram Business Account ID." };
  }

  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    if (!containerRes.ok) {
      const errData = await containerRes.text();
      return { success: false, error: `Instagram container error (${containerRes.status}): ${errData}` };
    }

    const containerData = await containerRes.json() as any;
    const creationId = containerData.id;

    await new Promise((r) => setTimeout(r, 5000));

    const publishRes = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishRes.ok) {
      const errData = await publishRes.text();
      return { success: false, error: `Instagram publish error (${publishRes.status}): ${errData}` };
    }

    const publishData = await publishRes.json() as any;
    return {
      success: true,
      postId: publishData.id,
      postUrl: `https://instagram.com/${account.username}`,
    };
  } catch (err: any) {
    return { success: false, error: `Instagram posting failed: ${err.message}` };
  }
}

export async function postToFacebook(
  account: SocialAccount,
  text: string,
  imageUrl?: string
): Promise<PostResult> {
  const { accessToken, pageId } = account;
  if (!accessToken || !pageId) {
    return { success: false, error: "Facebook credentials incomplete. Need Page Access Token and Page ID." };
  }

  try {
    let endpoint: string;
    let body: any;

    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
      body = { url: imageUrl, message: text, access_token: accessToken };
    } else {
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      body = { message: text, access_token: accessToken };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.text();
      return { success: false, error: `Facebook API error (${res.status}): ${errData}` };
    }

    const data = await res.json() as any;
    return {
      success: true,
      postId: data.id || data.post_id,
      postUrl: `https://facebook.com/${pageId}/posts/${data.id || data.post_id}`,
    };
  } catch (err: any) {
    return { success: false, error: `Facebook posting failed: ${err.message}` };
  }
}

export async function postToLinkedIn(
  account: SocialAccount,
  text: string,
  imageUrl?: string
): Promise<PostResult> {
  const { accessToken, businessAccountId } = account;
  if (!accessToken) {
    return { success: false, error: "LinkedIn credentials incomplete. Need Access Token." };
  }

  try {
    const authorUrn = businessAccountId
      ? `urn:li:organization:${businessAccountId}`
      : `urn:li:person:${account.username}`;

    const postBody: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const errData = await res.text();
      return { success: false, error: `LinkedIn API error (${res.status}): ${errData}` };
    }

    const data = await res.json() as any;
    return {
      success: true,
      postId: data.id,
      postUrl: `https://linkedin.com/feed/update/${data.id}`,
    };
  } catch (err: any) {
    return { success: false, error: `LinkedIn posting failed: ${err.message}` };
  }
}

export async function publishToSocialMedia(
  account: SocialAccount,
  content: string,
  imageUrl?: string
): Promise<PostResult> {
  switch (account.platform) {
    case "twitter":
      return postToTwitter(account, content, imageUrl);
    case "instagram":
      if (!imageUrl) {
        return { success: false, error: "Instagram requires an image for posting." };
      }
      return postToInstagramBusiness(account, content, imageUrl);
    case "facebook":
      return postToFacebook(account, content, imageUrl);
    case "linkedin":
      return postToLinkedIn(account, content, imageUrl);
    default:
      return { success: false, error: `Platform "${account.platform}" does not support auto-posting yet. Use the manual sharing assistant.` };
  }
}

export interface InstagramProfileData {
  username: string;
  name: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  website: string;
}

export interface TwitterProfileData {
  username: string;
  name: string;
  description: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount: number;
  profileImageUrl: string;
  createdAt: string;
}

export interface MediaPostData {
  id: string;
  caption: string;
  mediaType: string;
  timestamp: string;
  likeCount: number;
  commentCount: number;
  permalink: string;
}

export interface InstagramProfileResult {
  success: boolean;
  data?: InstagramProfileData;
  error?: string;
}

export interface TwitterProfileResult {
  success: boolean;
  data?: TwitterProfileData;
  error?: string;
}

export type ProfileResult = InstagramProfileResult | TwitterProfileResult;

export interface RecentMediaResult {
  success: boolean;
  posts?: MediaPostData[];
  error?: string;
}

export async function fetchInstagramProfile(account: SocialAccount): Promise<InstagramProfileResult> {
  const { accessToken, businessAccountId } = account;
  if (!accessToken || !businessAccountId) {
    return { success: false, error: "Instagram Business credentials incomplete. Need Meta Access Token and Business Account ID." };
  }
  try {
    const fields = "media_count,followers_count,follows_count,biography,name,profile_picture_url,username,website";
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}?fields=${fields}&access_token=${accessToken}`
    );
    if (!res.ok) {
      const errData = await res.text();
      return { success: false, error: `Instagram API error (${res.status}): ${errData}` };
    }
    const data = await res.json() as Record<string, unknown>;
    return {
      success: true,
      data: {
        username: String(data.username || account.username),
        name: String(data.name || ""),
        biography: String(data.biography || ""),
        followersCount: Number(data.followers_count) || 0,
        followsCount: Number(data.follows_count) || 0,
        mediaCount: Number(data.media_count) || 0,
        profilePictureUrl: String(data.profile_picture_url || ""),
        website: String(data.website || ""),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Instagram profile fetch failed: ${msg}` };
  }
}

export async function fetchInstagramRecentMedia(account: SocialAccount, limit: number = 6): Promise<RecentMediaResult> {
  const { accessToken, businessAccountId } = account;
  if (!accessToken || !businessAccountId) {
    return { success: false, error: "Instagram Business credentials incomplete." };
  }
  try {
    const fields = "id,caption,media_type,timestamp,like_count,comments_count,permalink";
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
    );
    if (!res.ok) {
      const errData = await res.text();
      return { success: false, error: `Instagram media error (${res.status}): ${errData}` };
    }
    interface IGMediaItem { id?: string; caption?: string; media_type?: string; timestamp?: string; like_count?: number; comments_count?: number; permalink?: string }
    const data = await res.json() as { data?: IGMediaItem[] };
    const posts: MediaPostData[] = (data.data || []).map((p: IGMediaItem) => ({
      id: String(p.id || ""),
      caption: p.caption ? p.caption.substring(0, 100) + (p.caption.length > 100 ? "..." : "") : "",
      mediaType: String(p.media_type || ""),
      timestamp: String(p.timestamp || ""),
      likeCount: Number(p.like_count) || 0,
      commentCount: Number(p.comments_count) || 0,
      permalink: String(p.permalink || ""),
    }));
    return { success: true, posts };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Instagram media fetch failed: ${msg}` };
  }
}

export async function fetchTwitterProfile(account: SocialAccount): Promise<TwitterProfileResult> {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = account;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { success: false, error: "Twitter API credentials incomplete." };
  }
  try {
    const oauthNonce = Math.random().toString(36).substring(2);
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
    const url = "https://api.twitter.com/2/users/me";
    const queryParamsObj: Record<string, string> = {
      "user.fields": "public_metrics,description,profile_image_url,created_at",
    };
    const auth = generateOAuth1Header(
      "GET", url, queryParamsObj,
      apiKey, apiSecret, accessToken, accessTokenSecret,
      oauthNonce, oauthTimestamp
    );
    const queryString = new URLSearchParams(queryParamsObj).toString();
    const res = await fetch(`${url}?${queryString}`, {
      headers: { "Authorization": auth },
    });
    if (!res.ok) {
      const errData = await res.text();
      return { success: false, error: `Twitter API error (${res.status}): ${errData}` };
    }
    interface TwitterPublicMetrics { followers_count?: number; following_count?: number; tweet_count?: number; listed_count?: number }
    interface TwitterUserData { username?: string; name?: string; description?: string; public_metrics?: TwitterPublicMetrics; profile_image_url?: string; created_at?: string }
    const json = await res.json() as { data?: TwitterUserData };
    const user = json.data || {};
    const pm = user.public_metrics || {};
    return {
      success: true,
      data: {
        username: String(user.username || account.username),
        name: String(user.name || ""),
        description: String(user.description || ""),
        followersCount: Number(pm.followers_count) || 0,
        followingCount: Number(pm.following_count) || 0,
        tweetCount: Number(pm.tweet_count) || 0,
        listedCount: Number(pm.listed_count) || 0,
        profileImageUrl: String(user.profile_image_url || ""),
        createdAt: String(user.created_at || ""),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Twitter profile fetch failed: ${msg}` };
  }
}

function generateOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  token: string,
  tokenSecret: string,
  nonce: string,
  timestamp: string
): string {
  const crypto = require("crypto");
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: token,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams.oauth_signature = signature;
  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}
