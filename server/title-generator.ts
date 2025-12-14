/**
 * AI-Powered Title Generator
 * 
 * Uses OpenAI to generate titles that are directly connected to and derived from
 * the actual post content. Prioritizes accuracy over creativity.
 */

import OpenAI from "openai";
import type { Category } from "@shared/schema";

const client = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function generateTitle(
  content: string,
  category: Category,
  timeframe: string,
  churchName?: string | null,
  denomination?: string | null
): Promise<string> {
  try {
    const contentPreview = content.length > 1500 ? content.substring(0, 1500) + "..." : content;
    
    const prompt = `Create a title for this anonymous church experience post. The title MUST directly reflect the actual content - do not invent details or themes that aren't present.

POST CONTENT:
"${contentPreview}"

METADATA:
- Category: ${category}
- When it happened: ${timeframe.replace(/_/g, " ")}${denomination ? `\n- Denomination: ${denomination}` : ""}${churchName ? `\n- Church: ${churchName}` : ""}

STRICT REQUIREMENTS:
1. The title MUST be derived from actual words, phrases, or events in the post
2. Do NOT invent dramatic themes that aren't explicitly stated
3. Do NOT use clichés like "breaking my silence" or "trust shattered" unless those exact concepts appear
4. If the post mentions specific events, use those as the title basis
5. If the post is vague, create a simple, honest title that matches its tone
6. Length: 35-70 characters
7. No questions, no emojis
8. Use the author's actual vocabulary when possible

APPROACH:
- Pull a key phrase or sentence directly from the content
- Summarize the main point in the author's own voice
- Keep it simple and honest rather than dramatic

Return ONLY the title text.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      temperature: 0.5,
    });

    let title = response.choices[0]?.message?.content?.trim() || "";
    title = title.replace(/^["']|["']$/g, "").trim();
    
    if (title.length < 15 || title.length > 90) {
      return generateFallbackTitle(content, category);
    }
    
    return title;
  } catch (error) {
    console.error("AI title generation failed, using fallback:", error);
    return generateFallbackTitle(content, category);
  }
}

function generateFallbackTitle(content: string, category: Category): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const firstSentence = sentences[0]?.trim();
  
  if (firstSentence && firstSentence.length >= 20 && firstSentence.length <= 70) {
    return firstSentence;
  }
  
  if (firstSentence && firstSentence.length > 70) {
    const words = firstSentence.split(' ');
    let truncated = '';
    for (const word of words) {
      if ((truncated + ' ' + word).trim().length <= 65) {
        truncated = (truncated + ' ' + word).trim();
      } else {
        break;
      }
    }
    return truncated + '...';
  }
  
  const categoryLabels: Record<Category, string> = {
    leadership: "A leadership experience at my church",
    financial: "A financial experience at my church", 
    culture: "A culture experience at my church",
    misconduct: "What I witnessed at my church",
    spiritual_abuse: "A spiritual experience at my church",
    other: "An experience at my church",
  };

  return categoryLabels[category] || categoryLabels.other;
}

export function generateTitleFromContent(content: string, category: Category): string {
  return generateFallbackTitle(content, category);
}
