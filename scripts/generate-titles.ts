/**
 * Script to retroactively add titles to existing submissions
 * Based on Reddit title optimization research:
 * - Dr. Randal S. Olson (850,000+ posts)
 * - Foundation Inc. (60,000 posts) 
 * - Koby Ofek (10+ million titles)
 */

import { db } from "../server/db";
import { submissions } from "../shared/schema";
import { generateTitle } from "../server/title-generator";
import { isNull, eq } from "drizzle-orm";
import type { Category } from "../shared/schema";

async function generateTitlesForExistingSubmissions() {
  console.log("Starting title generation for existing submissions...\n");
  
  const submissionsWithoutTitles = await db
    .select()
    .from(submissions)
    .where(isNull(submissions.title));
  
  console.log(`Found ${submissionsWithoutTitles.length} submissions without titles.\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const submission of submissionsWithoutTitles) {
    try {
      const title = generateTitle(
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
      
      console.log(`[${submission.id.substring(0, 8)}] Generated: "${title}"`);
      updated++;
    } catch (error) {
      console.error(`[${submission.id.substring(0, 8)}] Error:`, error);
      errors++;
    }
  }
  
  console.log(`\nTitle generation complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
}

generateTitlesForExistingSubmissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
