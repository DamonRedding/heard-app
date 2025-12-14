/**
 * Title Generator based on Reddit research:
 * - Dr. Randal S. Olson's analysis (850,000+ posts)
 * - Foundation Inc.'s study (60,000 posts)
 * - Koby Ofek's analysis (10+ million titles)
 * 
 * Key findings applied:
 * - Optimal length: 60-80 characters (8-12 words)
 * - Positive/neutral sentiment for constructive communities
 * - Power phrases: "the first time", "finally", discovery language
 * - Front-load important keywords
 * - No questions (questions reduce upvotes)
 */

import type { Category } from "@shared/schema";

const CATEGORY_THEMES: Record<Category, string[]> = {
  leadership: [
    "My experience with pastoral authority",
    "When church leadership crossed the line",
    "The truth about my pastor's leadership style",
    "How leadership decisions affected our congregation",
    "What happened when I questioned church authority",
    "My story of authoritarian leadership in church",
    "The impact of pastoral power dynamics",
    "When spiritual leaders abuse their position",
    "Breaking my silence on church leadership",
    "My journey through leadership abuse in church",
  ],
  financial: [
    "The hidden truth about my church's finances",
    "My experience with tithing pressure",
    "What they don't tell you about church finances",
    "When giving became manipulation",
    "The financial practices that made me leave",
    "My story of church financial pressure",
    "How my church handled money",
    "The truth behind the offering plate",
    "My experience with church financial transparency",
    "When faith and finances collide",
  ],
  culture: [
    "The toxic culture I experienced at church",
    "My story of exclusion in a faith community",
    "When church felt more like a clique",
    "The judgment I faced at my church",
    "My experience with church community dynamics",
    "How church culture affected my faith",
    "The exclusion that changed my perspective",
    "My story of navigating church politics",
    "When belonging came with conditions",
    "The cultural issues nobody talks about",
  ],
  misconduct: [
    "Breaking my silence on what I witnessed",
    "The misconduct that shattered my trust",
    "My experience reporting church misconduct",
    "What I saw behind closed doors",
    "The truth about what happened at my church",
    "When the unthinkable happened in my community",
    "My story of institutional betrayal",
    "How my church failed to protect",
    "Speaking up after years of silence",
    "The incident that changed everything",
  ],
  spiritual_abuse: [
    "My experience with spiritual manipulation",
    "When scripture was used as a weapon",
    "The spiritual abuse nobody believed",
    "How my faith was weaponized against me",
    "My story of religious control and shame",
    "Breaking free from spiritual manipulation",
    "The guilt tactics that held me captive",
    "When worship became psychological control",
    "My journey healing from spiritual abuse",
    "How faith leaders manipulated my beliefs",
  ],
  other: [
    "My church experience that needs to be heard",
    "A story from my faith community",
    "What I experienced at my church",
    "My honest reflection on church life",
    "The experience that shaped my faith journey",
    "Something that happened at my church",
    "My story from within the congregation",
    "An experience worth sharing",
    "What I witnessed in my faith community",
    "My account from inside the church",
  ],
};

const ENGAGEMENT_PHRASES = [
  "Finally speaking up about",
  "The truth about",
  "My experience with",
  "What really happened when",
  "Breaking my silence on",
  "Here's why",
  "The story of how",
  "What I learned from",
  "My journey through",
  "How I survived",
];

const TIME_REFERENCES: Record<string, string[]> = {
  last_month: ["Recently", "Just weeks ago", "This past month"],
  last_year: ["This year", "In the past year", "Months ago"],
  one_to_five_years: ["Years ago", "Looking back", "After all this time"],
  five_plus_years: ["After many years", "Decades later", "Finally after years"],
};

export function generateTitle(
  content: string,
  category: Category,
  timeframe: string,
  churchName?: string | null,
  denomination?: string | null
): string {
  const categoryTitles = CATEGORY_THEMES[category] || CATEGORY_THEMES.other;
  
  const contentLower = content.toLowerCase();
  
  let baseTitle = categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
  
  const hasEmotionalWords = /abuse|hurt|pain|trauma|scared|afraid|manipulation|control|shame|guilt|betrayal|trust/i.test(content);
  const hasFinancialWords = /money|tithe|offering|donation|fund|financial|giving|pay/i.test(content);
  const hasLeadershipWords = /pastor|leader|elder|deacon|minister|authority|power/i.test(content);
  
  if (hasEmotionalWords && category === "leadership") {
    baseTitle = "Breaking my silence on pastoral abuse";
  } else if (hasFinancialWords && category === "financial") {
    baseTitle = "The financial pressure that changed my faith";
  } else if (hasLeadershipWords) {
    baseTitle = "When church leadership failed us";
  }
  
  if (denomination && denomination !== "Other") {
    const denomTitles: Record<string, string[]> = {
      Baptist: ["My story from a Baptist church", "Inside a Baptist congregation"],
      Catholic: ["My experience in the Catholic Church", "A story from the Catholic faith"],
      Evangelical: ["My Evangelical church story", "Inside an Evangelical community"],
      Pentecostal: ["My Pentecostal experience", "From inside a Pentecostal church"],
      Methodist: ["My Methodist church story", "From a Methodist congregation"],
      Lutheran: ["My Lutheran church experience", "Inside a Lutheran community"],
      Presbyterian: ["My Presbyterian story", "From a Presbyterian church"],
      "Non-denominational": ["My non-denominational church experience", "Inside a non-denominational congregation"],
    };
    
    if (denomTitles[denomination]) {
      const denomOptions = denomTitles[denomination];
      if (Math.random() > 0.5) {
        baseTitle = denomOptions[Math.floor(Math.random() * denomOptions.length)];
      }
    }
  }
  
  if (churchName && churchName.length > 2) {
    if (Math.random() > 0.7) {
      baseTitle = `What happened at ${churchName}`;
    }
  }
  
  const timeRef = TIME_REFERENCES[timeframe];
  if (timeRef && Math.random() > 0.6) {
    const prefix = timeRef[Math.floor(Math.random() * timeRef.length)];
    baseTitle = `${prefix}: ${baseTitle.charAt(0).toLowerCase()}${baseTitle.slice(1)}`;
  }
  
  if (baseTitle.length > 80) {
    baseTitle = baseTitle.substring(0, 77) + "...";
  } else if (baseTitle.length < 40 && contentLower.length > 50) {
    const firstSentence = content.split(/[.!?]/)[0].trim();
    if (firstSentence.length >= 30 && firstSentence.length <= 80) {
      baseTitle = firstSentence;
    }
  }
  
  return baseTitle;
}

export function generateTitleFromContent(content: string, category: Category): string {
  const contentClean = content.replace(/\s+/g, ' ').trim();
  
  const sentences = contentClean.split(/(?<=[.!?])\s+/);
  
  if (sentences.length > 0) {
    let firstSentence = sentences[0].trim();
    
    if (firstSentence.length >= 30 && firstSentence.length <= 80) {
      return firstSentence.replace(/[.!?]$/, '');
    }
    
    if (firstSentence.length > 80) {
      const words = firstSentence.split(' ');
      let truncated = '';
      for (const word of words) {
        if ((truncated + ' ' + word).length <= 77) {
          truncated = truncated ? truncated + ' ' + word : word;
        } else {
          break;
        }
      }
      return truncated + '...';
    }
  }
  
  return CATEGORY_THEMES[category][0];
}
