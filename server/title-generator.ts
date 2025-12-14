/**
 * AI-Powered Title Generator
 * 
 * Uses OpenAI to generate varied, authentic titles that sound like the author wrote them.
 * Emphasizes diversity and natural voice over formulaic patterns.
 */

import OpenAI from "openai";
import type { Category } from "@shared/schema";

const client = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const CATEGORY_EMOTIONAL_CONTEXT: Record<Category, string> = {
  leadership: "authority, power dynamics, trust betrayal, institutional failure, speaking up",
  financial: "money pressure, transparency issues, accountability, giving, sacrifice",
  culture: "belonging, exclusion, judgment, community dynamics, feeling unseen",
  misconduct: "witnessing wrongdoing, institutional betrayal, justice, breaking silence",
  spiritual_abuse: "manipulation, control, weaponized faith, shame, freedom",
  other: "personal journey, church experience, faith community",
};

const DIVERSE_TITLE_EXAMPLES = [
  "After 15 years, I finally left",
  "What nobody tells you about megachurch finances",
  "The sermon that changed everything",
  "I was the pastor's favorite until I wasn't",
  "Three words that shattered my faith",
  "Why I stopped tithing",
  "The meeting that ended my silence",
  "Twelve years of looking the other way",
  "When the elders chose money over truth",
  "I believed them for too long",
  "The day I walked out mid-service",
  "How my church became a business",
  "Nobody warned me about the inner circle",
  "The guilt trips finally stopped working",
  "What happens when you question the pastor",
];

export async function generateTitle(
  content: string,
  category: Category,
  timeframe: string,
  churchName?: string | null,
  denomination?: string | null
): Promise<string> {
  try {
    const emotionalContext = CATEGORY_EMOTIONAL_CONTEXT[category] || CATEGORY_EMOTIONAL_CONTEXT.other;
    const contentPreview = content.length > 1200 ? content.substring(0, 1200) + "..." : content;
    
    const randomExamples = DIVERSE_TITLE_EXAMPLES
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(t => `- "${t}"`)
      .join("\n");

    const styleHints = [
      "a dramatic moment or turning point",
      "a time reference (years, days, moments)",
      "a specific detail from their story",
      "an emotional realization",
      "something they discovered or learned",
      "a contrast or irony",
      "what they wish they knew",
      "the thing that finally broke them",
    ];
    const randomHint = styleHints[Math.floor(Math.random() * styleHints.length)];

    const prompt = `Write ONE title for this anonymous church experience post. The title should sound exactly like the person who wrote the post.

POST:
${contentPreview}

CONTEXT: ${category} (themes: ${emotionalContext})${denomination ? ` | ${denomination}` : ""}

DIVERSE TITLE STYLES (for inspiration only, don't copy):
${randomExamples}

THIS title should focus on: ${randomHint}

RULES:
- 40-75 characters
- Sound human and personal, not corporate or clickbait
- Match the emotional tone of the post
- Avoid generic phrases like "My experience with..." or "The truth about..."
- No questions, no emojis
- Be specific to THIS story, not generic church complaints
- Vary your approach - could be a moment, a realization, a time reference, a detail

Return ONLY the title, no quotes or explanation.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80,
      temperature: 0.95,
      top_p: 0.9,
      frequency_penalty: 0.4,
      presence_penalty: 0.3,
    });

    let title = response.choices[0]?.message?.content?.trim() || "";
    title = title.replace(/^["']|["']$/g, "").trim();
    
    if (title.length < 15 || title.length > 100) {
      return generateFallbackTitle(content, category);
    }
    
    return title;
  } catch (error) {
    console.error("AI title generation failed, using fallback:", error);
    return generateFallbackTitle(content, category);
  }
}

function generateFallbackTitle(content: string, category: Category): string {
  const firstSentence = content.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 25 && firstSentence.length <= 75) {
    return firstSentence;
  }
  
  const categoryFallbacks: Record<Category, string[]> = {
    leadership: [
      "When the pastor became untouchable",
      "The leadership meeting that changed everything",
      "I finally saw behind the curtain",
    ],
    financial: [
      "Following the money changed my faith",
      "The building fund that broke my trust",
      "When giving became obligation",
    ],
    culture: [
      "The in-crowd I was never part of",
      "Invisible in my own church",
      "When community became performance",
    ],
    misconduct: [
      "What I saw that I can't unsee",
      "The day everything changed",
      "When silence was no longer an option",
    ],
    spiritual_abuse: [
      "How scripture became a weapon",
      "The shame that kept me quiet",
      "Breaking free after years of control",
    ],
    other: [
      "A story that needs to be told",
      "What happened at my church",
      "The moment I knew something was wrong",
    ],
  };

  const options = categoryFallbacks[category] || categoryFallbacks.other;
  return options[Math.floor(Math.random() * options.length)];
}

export function generateTitleFromContent(content: string, category: Category): string {
  return generateFallbackTitle(content, category);
}
