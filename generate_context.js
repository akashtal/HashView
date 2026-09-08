const fs = require('fs');
const transcriptLines = fs.readFileSync('/Users/akash/.gemini/antigravity-ide/brain/9859525d-1666-41e6-a3cb-3ec47d0f8564/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');

let lastPrompt = '';
for (let i = transcriptLines.length - 1; i >= 0; i--) {
    if (!transcriptLines[i]) continue;
    try {
        const item = JSON.parse(transcriptLines[i]);
        if (item.type === 'USER_INPUT') {
            lastPrompt = item.content;
            break;
        }
    } catch(e) {}
}

const qaBlocks = [];
const blocks = lastPrompt.split(/---\s*\n\d+\s*\nQuestion:/);

for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Extract question
    const qMatch = block.match(/^\s*"([^"]+)"/);
    if (!qMatch) continue;
    const question = qMatch[1];
    
    // Extract Answer type
    let answerType = 'static';
    const typeMatch = block.match(/Answer type:\s*([^\n]+)/i);
    if (typeMatch) answerType = typeMatch[1].trim();

    // Extract Answer / Answer rule
    let answer = '';
    const ansMatch = block.match(/(?:Answer rule:|Answer:|Answer type:[^\n]+)([\s\S]*?)(?=---\s*\n\d+\s*\nQuestion|==============================================================)/i);
    if (ansMatch) {
        answer = ansMatch[1].trim();
        // Remove 'Answer rule:' or 'Answer:' if they accidentally got caught in the match group
        answer = answer.replace(/^(Answer rule:|Answer:)\s*/i, '').trim();
    }
    
    qaBlocks.push({
        id: i,
        question,
        answerType,
        answer
    });
}

console.log("Parsed " + qaBlocks.length + " questions.");

const finalFileContent = `function getLondonTimeContext() {
  const now = new Date();
  const options = { timeZone: 'Europe/London', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    return formatter.format(now);
  } catch (err) {
    return now.toUTCString() + ' (Fallback timezone)';
  }
}

const IDEAS_FEST_2026_QA = ${JSON.stringify(qaBlocks, null, 2)};

function buildIdeasFestAIContext(latitude, longitude) {
  const londonTimeStr = getLondonTimeContext();
  let locContext = "Location unknown.";
  if (latitude && longitude) {
    locContext = \`Lat: \${latitude}, Lon: \${longitude}\`;
  }

  const qaContext = IDEAS_FEST_2026_QA.map(item => {
    return \`Q: \${item.question}\\nType: \${item.answerType}\\nA: \${item.answer}\`;
  }).join('\\n\\n------------------------\\n\\n');

  return \`
[IDEAS FEST 2026 EVENT CONTEXT]
The user is asking a question about Ideas Fest 2026. You are acting as the AI event concierge for this event.
Dates: 9–10 September 2026
Venue: Champneys Tring, Hertfordshire, HP23 6HY (what3words: ///pirate.croutons.sponsors)
Gates open: 9:00 AM, Site closes: 11:00 PM
Description: "The Glastonbury for Business" - not a conference. A festival.

[CURRENT LIVE CONTEXT]
Current Date/Time (Europe/London): \${londonTimeStr}
User GPS Coordinates: \${locContext}

[LIVE QUERY RULES]
"today" = current date in Europe/London
"tomorrow" = next day in Europe/London
"right now" = sessions currently running
"next" = nearest relevant future session/activity
"next hour" = current London time through current London time + 60 minutes
"this morning", "this afternoon", "this evening" = morning/afternoon/evening programming for the current event day
"tonight" = current day's evening/After Dark programme
"after this" = after the selected/current activity
"later" = relevant future activities on the current day

[LOCATION RULES]
If GPS exists, use latitude and longitude for near me/closest/nearby/how far/walking distance.
Use actual distance where coordinates exist.
If GPS is unavailable, say: "I don't have your live location right now. Turn on location to see what's closest."
Never fabricate distances.

[RECOMMENDATION RULES]
When user asks what to do/attend/best:
Consider: current London time, current location, next available session, user's interests, previous conversation, travel/walking time, food/coffee needs, networking goal, event-day schedule.
Do not randomly choose from the Q&A list.

[NO-HALLUCINATION RULES]
NEVER invent: speakers, founder status, investor status, nationality, gender, attendees, sessions, prices, menu items, ratings, opening hours, distances, parking availability, booking availability, ticket availability, venue locations, event statistics.
If information is missing, say it is unavailable.
"Best" questions: Do NOT claim the official website ranked them unless explicitly stated. Use: "One good option is...", "Based on your interests, I'd recommend...".

[CONVERSATION RULES]
The AI must naturally understand variations and follow-ups.
Example: User: "What's happening next?" -> AI returns upcoming. User: "Which one is about AI?" -> AI filters. User: "Where is it?" -> AI returns location.
Preserve previous selected items and understand conversational flow ("it", "that", "there", "next", "after that").
NEVER SOUND LIKE AN AI. Speak entirely like a human concierge.
DO NOT use phrases like "Based on the official data", "As an AI". Keep answers extremely conversational, friendly, and brief.

[IDEAS FEST 2026 VERIFIED Q&A KNOWLEDGE]
Use this data as ground truth. This is a partial dataset, not the complete agenda.
\${qaContext}
\`;
}

module.exports = {
  buildIdeasFestAIContext
};
`;

fs.writeFileSync('backend/ai-gateway/pipeline/ideasFestContext.js', finalFileContent);
console.log("File written to backend/ai-gateway/pipeline/ideasFestContext.js");
