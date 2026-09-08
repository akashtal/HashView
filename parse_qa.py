import json
import re

with open('/Users/akash/.gemini/antigravity-ide/brain/9859525d-1666-41e6-a3cb-3ec47d0f8564/.system_generated/logs/transcript.jsonl', 'r') as f:
    lines = f.readlines()

last_prompt = ""
for line in reversed(lines):
    if not line.strip(): continue
    try:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            last_prompt = data.get('content', '')
            break
    except:
        pass

# The questions are separated by "---"
blocks = last_prompt.split('---')

qa_list = []
for block in blocks:
    # Find something like:
    # 1
    # Question:
    # "What’s happening at Ideas Fest today?"
    
    q_match = re.search(r'Question:\s*"([^"]+)"', block)
    if not q_match:
        continue
    question = q_match.group(1)
    
    # Try to extract the id number before "Question:"
    id_match = re.search(r'(\d+)\s+Question:', block)
    q_id = int(id_match.group(1)) if id_match else len(qa_list) + 1
    
    ans_type_match = re.search(r'Answer type:\s*([^\n]+)', block, re.IGNORECASE)
    ans_type = ans_type_match.group(1).strip() if ans_type_match else 'static'
    
    # The answer text is everything after "Answer:" or "Answer rule:" or "Answer type:" (if no Answer line exists)
    # up to the end of the block.
    ans_match = re.search(r'(Answer:|Answer rule:)(.*)', block, re.IGNORECASE | re.DOTALL)
    if ans_match:
        answer = ans_match.group(2).strip()
    else:
        # fallback: get everything after Answer type:
        fallback = re.search(r'Answer type:[^\n]+(.*)', block, re.IGNORECASE | re.DOTALL)
        answer = fallback.group(1).strip() if fallback else ""

    qa_list.append({
        "id": q_id,
        "question": question,
        "answerType": ans_type,
        "answer": answer
    })

print(f"Parsed {len(qa_list)} questions.")

js_content = f"""function getLondonTimeContext() {{
  const now = new Date();
  const options = {{ timeZone: 'Europe/London', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }};
  try {{
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    return formatter.format(now);
  }} catch (err) {{
    return now.toUTCString() + ' (Fallback timezone)';
  }}
}}

const IDEAS_FEST_2026_QA = {json.dumps(qa_list, indent=2)};

function buildIdeasFestAIContext(latitude, longitude) {{
  const londonTimeStr = getLondonTimeContext();
  let locContext = "Location unknown.";
  if (latitude && longitude) {{
    locContext = `Lat: ${{latitude}}, Lon: ${{longitude}}`;
  }}

  const qaContext = IDEAS_FEST_2026_QA.map(item => {{
    return `Q: ${{item.question}}\\nType: ${{item.answerType}}\\nA: ${{item.answer}}`;
  }}).join('\\n\\n------------------------\\n\\n');

  return `
[IDEAS FEST 2026 EVENT CONTEXT]
The user is asking a question about Ideas Fest 2026. You are acting as the AI event concierge for this event.
Dates: 9–10 September 2026
Venue: Champneys Tring, Hertfordshire, HP23 6HY (what3words: ///pirate.croutons.sponsors)
Gates open: 9:00 AM, Site closes: 11:00 PM
Description: "The Glastonbury for Business" - not a conference. A festival.

[CURRENT LIVE CONTEXT]
Current Date/Time (Europe/London): ${{londonTimeStr}}
User GPS Coordinates: ${{locContext}}

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
${{qaContext}}
`;
}}

module.exports = {{
  buildIdeasFestAIContext
}};
"""

with open('backend/ai-gateway/pipeline/ideasFestContext.js', 'w') as f:
    f.write(js_content)

