/**
 * AI-Powered Title Generator
 * 
 * Uses OpenAI to generate titles that match each post's unique voice and tone.
 * Based on Reddit research:
 * - Optimal length: 60-80 characters (8-12 words)
 * - Positive/neutral sentiment for constructive communities
 * - Power phrases: "the first time", "finally", discovery language
 * - Front-load important keywords
 * - No questions (questions reduce upvotes)
 */

import OpenAI from "openai";
import type { Category } from "@shared/schema";

const client = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const CATEGORY_CONTEXT: Record<Category, string> = {
  leadership: "pastoral authority, church leadership, power dynamics",
  financial: "tithing, church finances, financial pressure, donations",
  culture: "church culture, community dynamics, exclusion, judgment",
  misconduct: "misconduct, institutional failure, accountability",
  spiritual_abuse: "spiritual manipulation, religious control, shame tactics",
  other: "church experience, faith community",
};

export async function generateTitle(
  content: string,
  category: Category,
  timeframe: string,
  churchName?: string | null,
  denomination?: string | null
): Promise<string> {
  try {
    const categoryContext = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT.other;
    
    const contentPreview = content.length > 1500 ? content.substring(0, 1500) + "..." : content;
    
    const prompt = `You are a title writer for a platform where people share anonymous church experiences. Generate a title that sounds like it was written by the same person who wrote this post.

POST CONTENT:
${contentPreview}

CONTEXT:
- Category: ${category} (${categoryContext})
- Timeframe: ${timeframe}${denomination ? `\n- Denomination: ${denomination}` : ""}${churchName ? `\n- Church: ${churchName}` : ""}

TITLE REQUIREMENTS:
1. Match the author's voice, tone, and emotional register
2. Length: 50-80 characters (aim for 60-70)
3. Use statement format, NOT a question
4. Sound personal and authentic (like a Reddit post title)
5. Front-load the most compelling element
6. Use power phrases naturally: "finally", "the truth about", "my experience with", "what happened when"
7. Avoid clickbait, sensationalism, or generic titles
8. Do NOT use emojis

Examples of good titles that match author voice:
- "Finally speaking up about what my pastor did to our family"
- "The financial manipulation that made me leave after 15 years"
- "My experience with spiritual abuse at a megachurch"
- "What happened when I questioned the leadership"

Return ONLY the title text, nothing else.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    let title = response.choices[0]?.message?.content?.trim() || "";
    
    title = title.replace(/^["']|["']$/g, "").trim();
    
    if (title.length < 20 || title.length > 100) {
      return generateFallbackTitle(content, category);
    }
    
    return title;
  } catch (error) {
    console.error("AI title generation failed, using fallback:", error);
    return generateFallbackTitle(content, category);
  }
}

function generateFallbackTitle(content: string, category: Category): string {
  const fallbackTitles: Record<Category, string[]> = {
    leadership: [
      "My experience with church leadership",
      "When pastoral authority crossed the line",
      "The truth about my church's leadership",
    ],
    financial: [
      "The financial pressure I experienced at church",
      "My story of tithing manipulation",
      "What they don't tell you about church finances",
    ],
    culture: [
      "The toxic culture I experienced at church",
      "My story of exclusion in a faith community",
      "When church felt more like a clique",
    ],
    misconduct: [
      "Breaking my silence on what I witnessed",
      "The misconduct that shattered my trust",
      "What I saw behind closed doors",
    ],
    spiritual_abuse: [
      "My experience with spiritual manipulation",
      "When scripture was used as a weapon",
      "Breaking free from spiritual abuse",
    ],
    other: [
      "My church experience that needs to be heard",
      "A story from my faith community",
      "What I experienced at my church",
    ],
  };

  const titles = fallbackTitles[category] || fallbackTitles.other;
  
  const firstSentence = content.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 30 && firstSentence.length <= 80) {
    return firstSentence;
  }
  
  return titles[Math.floor(Math.random() * titles.length)];
}

export function generateTitleFromContent(content: string, category: Category): string {
  return generateFallbackTitle(content, category);
}
