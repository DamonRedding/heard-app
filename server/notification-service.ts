import { storage } from "./storage";
import { sendEmail } from "./email";
import type { Submission, Category, NotificationEventType } from "@shared/schema";
import { CATEGORIES } from "@shared/schema";

function getCategoryLabel(category: Category): string {
  const found = CATEGORIES.find(c => c.value === category);
  return found?.label || category;
}

function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

export async function notifySubscribersOfNewSubmission(submission: Submission): Promise<void> {
  try {
    const subscribers = await storage.getSubscribersForNewSubmission(
      submission.category,
      submission.denomination
    );

    console.log(`Found ${subscribers.length} subscribers for new submission ${submission.id}`);

    for (const subscriber of subscribers) {
      if (subscriber.submissionId === submission.id) continue;

      const hasRecent = await storage.hasRecentNotification(
        subscriber.email,
        submission.id,
        "new_submission",
        24
      );

      if (hasRecent) {
        console.log(`Skipping duplicate notification for ${subscriber.email}`);
        continue;
      }

      const categoryLabel = getCategoryLabel(submission.category);
      const preview = truncateContent(submission.content);

      const result = await sendEmail({
        to: subscriber.email,
        subject: `New Story Shared in ${categoryLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">A New Story Has Been Shared</h1>
            <p>Someone in our community has shared a new experience.</p>
            <p><strong>Category:</strong> ${categoryLabel}</p>
            ${submission.denomination ? `<p><strong>Denomination:</strong> ${submission.denomination}</p>` : ''}
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; color: #333;">"${preview}"</p>
            </div>
            <p><a href="${process.env.APP_URL || 'https://churchheard.com'}" style="color: #1a1a2e;">Read and support this story</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">You received this email because you subscribed to ChurchHeard updates.</p>
          </div>
        `,
        text: `A New Story Has Been Shared\n\nCategory: ${categoryLabel}\n${submission.denomination ? `Denomination: ${submission.denomination}\n` : ''}\n"${preview}"\n\nVisit ChurchHeard to read and support this story.`
      });

      if (result.success) {
        await storage.createNotificationEvent({
          subscriberEmail: subscriber.email,
          submissionId: submission.id,
          eventType: "new_submission",
          metadata: JSON.stringify({ category: submission.category })
        });
        console.log(`Notified ${subscriber.email} of new submission`);
      } else {
        console.error(`Failed to notify ${subscriber.email}: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error("Error notifying subscribers:", error);
  }
}

export async function notifyAuthorOfEngagement(
  submissionId: string,
  eventType: "engagement_vote" | "engagement_comment" | "engagement_metoo",
  engagementDetails: string
): Promise<void> {
  try {
    const subscriber = await storage.getSubscriberBySubmissionId(submissionId);
    
    if (!subscriber || subscriber.notifyOnEngagement !== 1) {
      return;
    }

    const hasRecent = await storage.hasRecentNotification(
      subscriber.email,
      submissionId,
      eventType,
      24
    );

    if (hasRecent) {
      console.log(`Skipping duplicate engagement notification for ${subscriber.email}`);
      return;
    }

    const submission = await storage.getSubmission(submissionId);
    if (!submission) return;

    const eventLabels: Record<string, string> = {
      engagement_vote: "voted on",
      engagement_comment: "commented on",
      engagement_metoo: "related to"
    };

    const actionLabel = eventLabels[eventType] || "engaged with";

    const result = await sendEmail({
      to: subscriber.email,
      subject: `Someone ${actionLabel} your story on ChurchHeard`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a2e;">Your Story is Getting Attention</h1>
          <p>Someone has ${actionLabel} the story you shared on ChurchHeard.</p>
          <p>${engagementDetails}</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; color: #333;">"${truncateContent(submission.content)}"</p>
          </div>
          <p><a href="${process.env.APP_URL || 'https://churchheard.com'}" style="color: #1a1a2e;">View your story and responses</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">You received this email because you opted to receive engagement notifications.</p>
        </div>
      `,
      text: `Your Story is Getting Attention\n\nSomeone has ${actionLabel} the story you shared on ChurchHeard.\n\n${engagementDetails}\n\nVisit ChurchHeard to view your story and responses.`
    });

    if (result.success) {
      await storage.createNotificationEvent({
        subscriberEmail: subscriber.email,
        submissionId: submissionId,
        eventType: eventType,
        metadata: JSON.stringify({ details: engagementDetails })
      });
      console.log(`Notified author ${subscriber.email} of engagement`);
    } else {
      console.error(`Failed to notify author: ${result.error}`);
    }
  } catch (error) {
    console.error("Error notifying author of engagement:", error);
  }
}

export async function sendWeeklyDigest(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  try {
    const subscribers = await storage.getAllWeeklyDigestSubscribers();
    const popularSubmissions = await storage.getPopularSubmissionsForDigest(10);

    if (popularSubmissions.length === 0) {
      console.log("No popular submissions for weekly digest");
      return { sent, failed };
    }

    console.log(`Sending weekly digest to ${subscribers.length} subscribers`);

    for (const subscriber of subscribers) {
      const hasRecent = await storage.hasRecentNotification(
        subscriber.email,
        "weekly_digest",
        "weekly_digest",
        168
      );

      if (hasRecent) {
        console.log(`Skipping duplicate weekly digest for ${subscriber.email}`);
        continue;
      }

      const storiesHtml = popularSubmissions.map(sub => `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1a1a2e;">${getCategoryLabel(sub.category)}</p>
          <p style="margin: 0; color: #333;">"${truncateContent(sub.content, 150)}"</p>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">
            ${sub.condemnCount + sub.absolveCount} votes • ${sub.meTooCount} people relate
          </p>
        </div>
      `).join('');

      const result = await sendEmail({
        to: subscriber.email,
        subject: "Your Weekly ChurchHeard Digest",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Weekly Community Digest</h1>
            <p>Here are some of the most impactful stories shared this week:</p>
            ${storiesHtml}
            <p><a href="${process.env.APP_URL || 'https://churchheard.com'}" style="color: #1a1a2e;">Read more stories on ChurchHeard</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">You received this email because you subscribed to the weekly digest.</p>
          </div>
        `,
        text: `Weekly Community Digest\n\nHere are some of the most impactful stories shared this week:\n\n${popularSubmissions.map(sub => `${getCategoryLabel(sub.category)}: "${truncateContent(sub.content, 150)}"`).join('\n\n')}\n\nVisit ChurchHeard to read more.`
      });

      if (result.success) {
        await storage.createNotificationEvent({
          subscriberEmail: subscriber.email,
          submissionId: null,
          eventType: "weekly_digest",
          metadata: JSON.stringify({ count: popularSubmissions.length })
        });
        sent++;
        console.log(`Sent weekly digest to ${subscriber.email}`);
      } else {
        failed++;
        console.error(`Failed to send digest to ${subscriber.email}: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error("Error sending weekly digest:", error);
  }

  return { sent, failed };
}
