/**
 * Script to generate AI-powered titles for all existing submissions
 * Uses OpenAI to match each post's unique voice and tone
 */

import { db } from "../server/db";
import { submissions } from "../shared/schema";
import { generateTitle } from "../server/title-generator";
import { eq } from "drizzle-orm";
import type { Category } from "../shared/schema";

async function generateTitlesForAllSubmissions() {
  console.log("Starting AI title generation for all submissions...\n");
  
  const allSubmissions = await db.select().from(submissions);
  
  console.log(`Found ${allSubmissions.length} submissions to process.\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const submission of allSubmissions) {
    try {
      console.log(`[${submission.id.substring(0, 8)}] Generating title...`);
      
      const title = await generateTitle(
        submission.content,
        submission.category as Category,
        submission.timeframe,
        submission.churchName,
        submission.denomination
      );
      
      await db
        .update(submissions)
        .set({ title })
        .where(eq(submissions.id, submission.id));
      
      console.log(`  → "${title}"`);
      updated++;
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[${submission.id.substring(0, 8)}] Error:`, error);
      errors++;
    }
  }
  
  console.log(`\nTitle generation complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
}

generateTitlesForAllSubmissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
