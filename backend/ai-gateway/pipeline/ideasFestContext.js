function getLondonTimeContext() {
  const now = new Date();
  const options = { timeZone: 'Europe/London', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    return formatter.format(now);
  } catch (err) {
    return now.toUTCString() + ' (Fallback timezone)';
  }
}

const IDEAS_FEST_2026_QA = [
  { id: 1, question: "What’s happening at Ideas Fest today?", answerType: "dynamic", answer: "Use current Europe/London date. Before 9 Sep: 'Ideas Fest hasn't started yet.' On 9 Sep: return relevant Day 1 programme. On 10 Sep: return relevant Day 2 programme. After 10 Sep: 'Ideas Fest 2026 has finished.'" },
  { id: 2, question: "What’s on right now?", answerType: "dynamic", answer: "Use: start <= now < end using current London time. Return currently active official sessions. If none: show nearest upcoming relevant options." },
  { id: 3, question: "What events are happening this afternoon?", answerType: "dynamic", answer: "Use today's London date and official agenda to return afternoon sessions. Examples: Funding an Acquisition (14:15, The Deal Room); Open Mic Pitching (15:30-16:30, Deep Dive). Do not imply this is the complete programme." },
  { id: 4, question: "What’s happening tonight?", answerType: "dynamic", answer: "Wed 9 Sep: 19:00 James Haskell, 21:00 Rick Parfitt Jnr. Thu 10 Sep: 19:00 Showhawk Duo, 21:00 DJ Fat Tony. Site closes at 23:00. Use current London date." },
  { id: 5, question: "What are the main events I shouldn’t miss?", answerType: "partial", answer: "The festival doesn't publish an official must-see ranking, but highlights include: Simon Squibb - What's Your Dream?, Pitch Perfect, Simon Says: Live Q&A, Open Mic Pitching, The AI Den, DreamBrew Launch Party, James Haskell, Showhawk Duo, DJ Fat Tony. Choose based on interests." },
  { id: 6, question: "What talks are happening today?", answerType: "dynamic", answer: "Use current official agenda. Return useful/relevant talks. Do not dump hundreds of results unless asked." },
  { id: 7, question: "Who is speaking today?", answerType: "dynamic", answer: "Use current London date + official agenda + speaker data. Return speakers scheduled for today." },
  { id: 8, question: "Which talks are happening right now?", answerType: "dynamic", answer: "Use start <= current London time < end. Return currently running talks from current agenda." },
  { id: 9, question: "What’s happening in the next hour?", answerType: "dynamic", answer: "Calculate: now through now + 60 minutes. Return title, time, speaker, location, description. Sort chronologically." },
  { id: 10, question: "What’s the schedule for today?", answerType: "dynamic", answer: "Use current official agenda. Provide a practical summary. Do not dump the entire 500+ schedule." },
  { id: 11, question: "Which founders are at Ideas Fest?", answerType: "partial", answer: "Use verified profiles. Examples: Greg Jackson, Thea Green, Spencer Matthews, Simon Squibb, Daniel Priestley, Lottie Whyte, Louise Hill, Pip Jamieson, Wilfred Emmanuel-Jones, Brin Pirathapan, Victoria Prew, Roei Samuel, Vasily Alekseenko, Zac Froud, Ben Newman, Elin Roberts. Not every speaker is a founder." },
  { id: 12, question: "Who are the biggest founders here?", answerType: "partial", answer: "There is no official ranking. Frame as 'prominent or widely recognised'. Examples: Greg Jackson, Thea Green, Spencer Matthews, Simon Squibb, Daniel Priestley, Simon Woodroffe, Michael Acton Smith, Sir Richard Harpin." },
  { id: 13, question: "Which startup founders should I meet?", answerType: "partial/dynamic", answer: "Personalize based on goal. AI: Zac Froud, Piers Linney, Dr Aalok Shukla, Jake Leeming, David Amor, Chris Meah, Chris Kenna. Funding: Simon Squibb, Daniel Priestley, Roei Samuel, Vasily Alekseenko. Food: Brin Pirathapan, Wilfred Emmanuel-Jones, Ben Newman, Elin Roberts." },
  { id: 14, question: "Are there any food-tech founders here?", answerType: "partial", answer: "There is no definitive food-tech category. Relevant food-business people: Brin Pirathapan, Wilfred Emmanuel-Jones, Ben Newman, Elin Roberts, Deepak Ravindran, Aron Gelbard." },
  { id: 15, question: "Are there any AI founders here?", answerType: "partial", answer: "Yes. Zac Froud - founder of advcy.ai. Other relevant AI people: Piers Linney, Dr Aalok Shukla, Jake Leeming, David Amor, Chris Meah, Chris Kenna, Danielle Green, Lucy McCarraher." },
  { id: 16, question: "Which investors are attending?", answerType: "partial", answer: "Use official profiles. Examples: Dominnique Karetsos, Hugh Chappell, Todd Sullivan, Brian Dukes, Ryan Clark, Chloe Lambert, Lydia Finnegan, Pieter Van Rooyen, Dr Jill Jones. Not a complete list." },
  { id: 17, question: "Who should I network with if I’m building a startup?", answerType: "dynamic", answer: "Recommend StartUp Zone, Dreamland, The Deal Room, The AI Den, Deep Dive, Camp Fire, Launch Pad, The Ideas Oasis based on industry and goals." },
  { id: 18, question: "Are there any female founders here?", answerType: "partial", answer: "Yes. Ideas By Her provides programming. Areas: Women Are Good Business Pavilion, Female Founders Unfiltered, The Starling Social Club, The Unapologetic Space. Use verified profiles. Never infer gender." },
  { id: 19, question: "Which founders are from the UK?", answerType: "partial", answer: "No complete nationality field exists. Safe response: 'Many founders and business leaders in the lineup are connected to UK-based businesses, but the official directory doesn't provide a complete nationality field for everyone.'" },
  { id: 20, question: "Where can I meet other entrepreneurs?", answerType: "static/dynamic", answer: "Useful areas: StartUp Zone, Dreamland, The Deal Room, Deep Dive, The HoLT, The Big Festoon, The Starling Social Club, Food & Drink Village, Camp Fire, Launch Pad, Purpose Pavilion, The Ideas Oasis, The AI Den." },
  { id: 21, question: "Where can I get coffee?", answerType: "dynamic", answer: "Official options: Brinkleys Coffee, Rovello Coffee, KitchenAid Airstream & Lounge, The Starling Social Club. Use location." },
  { id: 22, question: "What’s the best coffee near me?", answerType: "dynamic", answer: "No official best-coffee ranking. Use GPS + map data to recommend nearest option. Never invent a rating." },
  { id: 23, question: "Where can I get breakfast?", answerType: "partial/dynamic", answer: "Food & Drink Village includes breakfast. Potential traders: Brinkleys Coffee, Jeco Bowls, Anna Mae's, Get Fed, Tokyo Kitchen, Oyster Buoys, Taste Tibet, Pizza Arti. Do not invent menus." },
  { id: 24, question: "Where can I get lunch?", answerType: "dynamic", answer: "Food & Drink Village options: Jeco Bowls, Anna Mae's, Get Fed, Tokyo Kitchen, Oyster Buoys, Taste Tibet, Pizza Arti, Tapas Bravas, Los Gordos, Well Nice Food, Lorna's Indian Kitchen, Brinkleys Burgers, Funky Elephant, Blanco Nino, Sonny's, The Vegan Patty Lady, Spudman, Bhangra Blends." },
  { id: 25, question: "What food is available at Ideas Fest?", answerType: "static", answer: "Traders include Jeco Bowls, Anna Mae's, Tokyo Kitchen, Pizza Arti, Tapas Bravas, Brinkleys Burgers, Spudman, Bhangra Blends, etc. Bars: Prime Time Bar, Pimentae. Vegan, vegetarian, gluten-free options. Cashless site." },
  { id: 26, question: "What are the best food options here?", answerType: "partial", answer: "No authoritative ranking. Personalize: Indian (Lorna's, Bhangra Blends), Vegan (Vegan Patty Lady), Burgers (Brinkleys), Pizza (Pizza Arti), Potato (Spudman). Coffee (Brinkleys, Rovello)." },
  { id: 27, question: "Is there vegetarian food?", answerType: "static", answer: "Yes. Vegetarian, vegan and gluten-free options are available across the site." },
  { id: 28, question: "Is there Indian food nearby?", answerType: "dynamic", answer: "Yes. Lorna's Indian Kitchen and Bhangra Blends. Use GPS for proximity." },
  { id: 29, question: "Where can I get something quick to eat?", answerType: "dynamic", answer: "Options: Pizza Arti, Spudman, Lorna's Indian Kitchen, Bhangra Blends, Brinkleys Burgers, The Vegan Patty Lady, Jeco Bowls, Taste Tibet. Do not invent queue times." },
  { id: 30, question: "Where can I get food under £10?", answerType: "static", answer: "The official site lists traders but doesn't publish complete menu pricing, so I can't reliably confirm which meals are under £10." },
  { id: 31, question: "Where can I get a good dessert?", answerType: "partial", answer: "The official website does not provide an authoritative dessert list. Only answer with verified current menu information." },
  { id: 32, question: "What’s near me right now?", answerType: "dynamic", answer: "Use GPS + current London time + site data to rank by real distance. Do not fabricate distance." },
  { id: 33, question: "What restaurants are nearby?", answerType: "dynamic", answer: "Inside: use Food & Drink Village. Outside: use trusted nearby-business capability if available. Do not fabricate outside restaurants." },
  { id: 34, question: "What’s the best place to eat near Ideas Fest?", answerType: "dynamic", answer: "Inside: Food & Drink Village. Outside: trusted nearby-business data. Do not claim an official ranking." },
  { id: 35, question: "Where can I go for a drink after the event?", answerType: "dynamic", answer: "Inside: Prime Time Bar, Pimentae. Evening entertainment runs until late, site closes at 23:00. Outside: use nearby-business data." },
  { id: 36, question: "What’s the best place nearby to network over coffee?", answerType: "dynamic", answer: "Good choices: KitchenAid Airstream & Lounge, The Starling Social Club, Female Founders Unfiltered, The HoLT, The Big Festoon. Use location." },
  { id: 37, question: "What should I do next?", answerType: "dynamic", answer: "Contextual recommendation. Use current time, location, next sessions, interests, and distance to give a practical recommendation." },
  { id: 38, question: "When is Ideas Fest 2026?", answerType: "static", answer: "9–10 September 2026." },
  { id: 39, question: "Where is Ideas Fest?", answerType: "static", answer: "Champneys Tring, Hertfordshire, HP23 6HY. Mention Shootersway entrance." },
  { id: 40, question: "What is the exact event location?", answerType: "static", answer: "Champneys Tring, Hertfordshire, HP23 6HY. what3words: ///pirate.croutons.sponsors" },
  { id: 41, question: "What time do the gates open?", answerType: "static", answer: "9:00 AM." },
  { id: 42, question: "What time does the main programme start?", answerType: "static", answer: "9:00 AM." },
  { id: 43, question: "What time does the main programme finish?", answerType: "static", answer: "The main programme runs to around 6:00 PM, with After Dark continuing into the evening." },
  { id: 44, question: "What time does the site close?", answerType: "static", answer: "11:00 PM." },
  { id: 45, question: "Is Ideas Fest a conference?", answerType: "static", answer: "No. Ideas Fest describes itself as a festival rather than a conventional conference, combining business sessions with food, networking, wellbeing, music and evening entertainment." },
  { id: 46, question: "How many talks are there?", answerType: "static", answer: "The official site describes 500+ talks and sessions across two days." },
  { id: 47, question: "How many speakers are there?", answerType: "static", answer: "The official speaker page describes more than 500 speakers across the two days." },
  { id: 48, question: "How many people attend Ideas Fest?", answerType: "static", answer: "The official site describes the festival as bringing together 6,000+ entrepreneurs, founders and business leaders." },
  { id: 49, question: "What is Ideas Fest?", answerType: "static", answer: "A two-day business festival at Champneys Tring bringing together entrepreneurs, founders and business leaders for talks, networking, workshops, food, wellbeing and evening entertainment." },
  { id: 50, question: "What is the AI Den?", answerType: "static", answer: "The AI Den is a dedicated Ideas Fest 2026 space for practical AI, with live demos, hands-on workshops and conversations about applying AI to areas such as sales, operations and customer experience." },
  { id: 51, question: "Where is the AI Den?", answerType: "static", answer: "The AI Den is in the Growth Village. Use current site map for exact position." },
  { id: 52, question: "Are there AI workshops?", answerType: "static", answer: "Yes. The AI Den runs a programme of AI talks, demos and hands-on workshops across both days." },
  { id: 53, question: "Are there AI demos?", answerType: "static", answer: "Yes. The official AI Den programme includes live demos." },
  { id: 54, question: "Who is behind the AI Den?", answerType: "static", answer: "The AI Den is powered by Implement AI." },
  { id: 55, question: "Who is Zac Froud?", answerType: "static", answer: "Zac Froud is the founder of advcy.ai and is on the Ideas Fest 2026 speaker lineup." },
  { id: 56, question: "When is Zac Froud speaking?", answerType: "static", answer: "His official Ideas Fest profile lists a Wednesday 9 September session at 13:00–13:45 in the Greenhouse." },
  { id: 57, question: "What is The StartUp Zone?", answerType: "static", answer: "A dedicated area for early-stage founders finding first customers, first hires and practical support." },
  { id: 58, question: "Where is the StartUp Zone?", answerType: "static", answer: "Use the official site map. Spaces include: The Xero Stage, Camp Fire, Launch Pad, Tool Shed, Innovation Base Camp, Purpose Pavilion, The Swap Shop, The Franchise Launchpad, The Ideas Oasis." },
  { id: 59, question: "What is Growth Village?", answerType: "static", answer: "Growth Village is designed for operators scaling past the messy middle, with sessions on systems, capital, hiring and difficult scaling decisions." },
  { id: 60, question: "Who is Growth Village for?", answerType: "static", answer: "It is aimed at businesses and operators moving beyond the early-stage phase and trying to scale." },
  { id: 61, question: "What is the Deal Room?", answerType: "static", answer: "The Deal Room is a space focused on investment, acquisitions, deals and conversations between founders and people involved in transactions." },
  { id: 62, question: "Where can I learn about fundraising?", answerType: "static", answer: "Start with The Deal Room and funding-focused sessions on the current agenda." },
  { id: 63, question: "Where can I learn about acquisitions?", answerType: "static", answer: "The Deal Room includes acquisition-related programming. Example: Funding an Acquisition (14:15, The Deal Room)." },
  { id: 64, question: "Where can I pitch my startup?", answerType: "static", answer: "Look for Pitch Perfect and Open Mic Pitching & Networking on the official agenda." },
  { id: 65, question: "What is Pitch Perfect?", answerType: "static", answer: "Pitch Perfect is an Ideas Fest pitching session powered by the Dream Fund." },
  { id: 66, question: "What is Open Mic Pitching & Networking?", answerType: "static", answer: "It is a 60-second pitching and networking session. Confirmed Wednesday session: 15:30–16:30 Deep Dive." },
  { id: 67, question: "Where can I find mentors?", answerType: "static", answer: "Dreamland is specifically designed around finding people who can help, gain knowledge and potentially meet a co-founder, first customer or mentor." },
  { id: 68, question: "Where can I find a co-founder?", answerType: "static", answer: "Dreamland is one of the strongest places to start, and founder networking also happens across the StartUp Zone." },
  { id: 69, question: "Where can I find potential customers?", answerType: "static", answer: "StartUp Zone and Dreamland are useful starting points, alongside networking throughout the festival." },
  { id: 70, question: "Where can I meet startup advisors?", answerType: "static", answer: "Look in StartUp Zone, Dreamland, The Deal Room and relevant founder sessions." },
  { id: 71, question: "What is Dreamland?", answerType: "static", answer: "Dreamland is a space for dreamers to find their people, get help, gain knowledge, pitch ideas and potentially meet a co-founder, first customer or mentor." },
  { id: 72, question: "What is in Dreamland?", answerType: "static", answer: "The Acorn Stage, The Inspiration Stage and Doorbell of Dreams." },
  { id: 73, question: "What is The Acorn Stage?", answerType: "static", answer: "It is one of the stages inside Dreamland. Use the current agenda for its sessions." },
  { id: 74, question: "What is Doorbell of Dreams?", answerType: "static", answer: "It is a Dreamland area designed around pitching ideas and connecting with people who may help make them happen." },
  { id: 75, question: "What is Ideas By Her?", answerType: "static", answer: "It is dedicated programming designed specifically for women building businesses." },
  { id: 76, question: "What is the Women Are Good Business Pavilion?", answerType: "static", answer: "It is a space focused on female-founded businesses and the capital supporting them." },
  { id: 77, question: "What is Female Founders Unfiltered?", answerType: "static", answer: "It is an Ideas By Her programme focused on women founders and business-building conversations." },
  { id: 78, question: "Is there networking for women founders?", answerType: "static", answer: "Yes. Ideas By Her includes female-founder-focused networking and programming." },
  { id: 79, question: "What is the Founder Recovery Zone?", answerType: "static", answer: "It is a high-performance founder wellbeing zone featuring recovery and wellness experiences (infrared sauna, ice baths, IV drips, etc.)." },
  { id: 80, question: "Where can I relax?", answerType: "static", answer: "Try the Founder Recovery Zone. Potential spaces: Zoky Saunascape, Wood-Fired Sauna, Chilled Plunge Pools, Unplugged, Sunrise Yoga, The Sober Bar, The Brewin Basecamp." },
  { id: 81, question: "Is there a sauna?", answerType: "static", answer: "Yes. Zoky Saunascape and the Wood-Fired Sauna are part of the Founder Recovery Zone." },
  { id: 82, question: "Is there a cold plunge?", answerType: "static", answer: "Yes. Chilled Plunge Pools are available in the Founder Recovery Zone." },
  { id: 83, question: "Is there yoga?", answerType: "static", answer: "Yes. Sunrise Yoga is scheduled for Day 2." },
  { id: 84, question: "What time is Sunrise Yoga?", answerType: "static", answer: "Sunrise Yoga is scheduled for 8:00 AM on Thursday 10 September." },
  { id: 85, question: "Can I book wellness activities?", answerType: "static", answer: "Yes. Some workshops, clinics and small-group sessions can be booked in advance and have limited capacity." },
  { id: 86, question: "How many activities can I book?", answerType: "static", answer: "The official booking page currently lists 22 bookable activities." },
  { id: 87, question: "Do I need a festival pass to book an activity?", answerType: "static", answer: "Yes. The official booking page says you need a festival pass before claiming places on bookable sessions." },
  { id: 88, question: "Do bookable activities cost extra?", answerType: "static", answer: "The official site says the bookable workshops, clinics and small-group sessions are included with your festival pass, subject to limited capacity." },
  { id: 89, question: "Where can I work during Ideas Fest?", answerType: "static", answer: "The Stoneway Workspace Hub is designed for working, taking calls and hosting meetings during the festival." },
  { id: 90, question: "Is there Wi-Fi?", answerType: "static", answer: "The Stoneway Workspace Hub is described as providing Wi-Fi along with desks, sofas and quiet spaces." },
  { id: 91, question: "Where can I take a business call?", answerType: "static", answer: "The Stoneway Workspace Hub is designed for working and taking calls." },
  { id: 92, question: "Where can I host a meeting?", answerType: "static", answer: "The Stoneway Workspace Hub provides a place to work and host meetings." },
  { id: 93, question: "What is the Stoneway Workspace Hub?", answerType: "static", answer: "A calm workspace at Ideas Fest, powered by Stoneway x Knotel x Greenwoods, with desks, Wi-Fi and quiet areas for working, calls and meetings." },
  { id: 94, question: "Where can I get coffee in the morning?", answerType: "static", answer: "Brinkleys Coffee, Rovello Coffee, KitchenAid Airstream & Lounge and The Starling Social Club are official options." },
  { id: 95, question: "What happens at the Starling Social Club?", answerType: "static", answer: "It is a social/coffee area and hosts morning programming including the Starter Party with DJ Vinyl Jen." },
  { id: 96, question: "Is there a morning party?", answerType: "static", answer: "Yes. The official What's On page describes a morning Starter Party with DJ Vinyl Jen at The Starling Social Club." },
  { id: 97, question: "What food is available?", answerType: "static", answer: "Use the official Food & Drink Village trader list. Do not invent menus." },
  { id: 98, question: "Is the festival cashless?", answerType: "static", answer: "Yes." },
  { id: 99, question: "Where can I refill my water?", answerType: "static", answer: "Free water refill points are available throughout the site." },
  { id: 100, question: "Is there vegan food?", answerType: "static", answer: "Yes. The official site says vegan options are available across the site." },
  { id: 101, question: "Is there gluten-free food?", answerType: "static", answer: "Yes. The official site says gluten-free options are available across the site." },
  { id: 102, question: "Where can I get Indian food?", answerType: "static", answer: "Lorna's Indian Kitchen and Bhangra Blends are official food traders." },
  { id: 103, question: "Where can I get burgers?", answerType: "static", answer: "Brinkleys Burgers is an official food trader." },
  { id: 104, question: "Where can I get pizza?", answerType: "static", answer: "Pizza Arti is an official food trader." },
  { id: 105, question: "Where can I get bowls?", answerType: "static", answer: "Jeco Bowls is an official food trader." },
  { id: 106, question: "Where can I get something vegetarian?", answerType: "static", answer: "Vegetarian options are available across the site. Use the current food trader data to find a nearby suitable option." },
  { id: 107, question: "Where can I get vegan food?", answerType: "static", answer: "The Vegan Patty Lady is one official option, and the festival says vegan food is available across the site." },
  { id: 108, question: "Where can I get drinks?", answerType: "static", answer: "Prime Time Bar and Pimentae are the two listed bars." },
  { id: 109, question: "What is Prime Time Bar?", answerType: "static", answer: "Prime Time Bar is the festival's bar serving British-brewed lager, IPA and a caffeine-infused lager." },
  { id: 110, question: "What is Pimentae?", answerType: "static", answer: "Pimentae is the festival cocktail van, known for tequila cocktails and margarita-style drinks." },
  { id: 111, question: "What's happening after 6 PM?", answerType: "static", answer: "After Dark continues into the evening with music, DJs and live entertainment. Use the current evening programme for exact events." },
  { id: 112, question: "Who is playing tonight?", answerType: "static", answer: "Use the current official evening programme. Wed: 19:00 James Haskell, 21:00 Rick Parfitt Jnr. Thu: 19:00 Showhawk Duo, 21:00 DJ Fat Tony." },
  { id: 113, question: "Is the evening entertainment included?", answerType: "static", answer: "The official ticket information says the 2-day pass includes the whole festival, including fire pits, saunas and DJ sets." },
  { id: 114, question: "What is the Great British Build-Off?", answerType: "static", answer: "It is a competition where participants build an idea live on Macaly AI in 90 minutes. Prize: £5,000 plus up to 200 million Macaly AI credits." },
  { id: 115, question: "What is the Hydration Station?", answerType: "static", answer: "It is an Ideas Fest area where attendees can ask TikTok questions, get hydrated and talk with members of the TikTok team between sessions." },
  { id: 116, question: "What is Love SAMBA?", answerType: "static", answer: "SAMBA stands for Sales, Automation, Marketing, Branding and AI. It includes practical sessions and live clinics around sales and marketing." },
  { id: 117, question: "What is The Full Package, Supplied?", answerType: "static", answer: "It focuses on product manufacturing, packaging and getting products from first sample to international shelves." },
  { id: 118, question: "What are Ideas Fest OGs?", answerType: "static", answer: "It is the area containing the original Ideas Fest stages, including Conversations That Matter, Real Talk, Unapologetic Space and This or That Stage." },
  { id: 119, question: "What is This or That Stage?", answerType: "static", answer: "It is a debate format where two sides of a business argument are put head-to-head and the field picks a side." },
  { id: 120, question: "What is Deep Dive?", answerType: "static", answer: "Deep Dive is the workshop space for longer, hands-on sessions designed to go beyond surface-level advice." },
  { id: 121, question: "What is The HoLT?", answerType: "static", answer: "It is an Ideas Fest conversation space designed for more relaxed, slower interactions between sessions." },
  { id: 122, question: "What is The Big Festoon?", answerType: "static", answer: "It is a social/business gathering space designed for informal conversations and connections." },
  { id: 123, question: "Where can I have a casual networking conversation?", answerType: "static", answer: "Good options include The Big Festoon, The HoLT, Food & Drink Village, The Starling Social Club and informal spaces between sessions." },
  { id: 124, question: "Can I meet people between sessions?", answerType: "static", answer: "Yes. Ideas Fest explicitly emphasizes conversations between sessions and informal networking around the field." },
  { id: 125, question: "How do I get to Ideas Fest by train?", answerType: "static", answer: "Travel to Tring Train Station. The official site says Tring is directly connected to London Euston (around 33–35 mins)." },
  { id: 126, question: "How far is Tring station from Ideas Fest?", answerType: "static", answer: "The official site describes Tring Station as about 5 miles / around 8 minutes by taxi." },
  { id: 127, question: "Is there a shuttle from Tring station?", answerType: "static", answer: "Yes. A free festival shuttle operates between Tring Station and the festival." },
  { id: 128, question: "Do I need to book the Tring shuttle?", answerType: "static", answer: "No. The official site says the festival shuttle from Tring Station does not require booking." },
  { id: 129, question: "When do buses leave Tring Station?", answerType: "static", answer: "The official site says three double-decker buses operate from around 8:30 AM until around 10:30 AM, followed by a smaller shuttle service." },
  { id: 130, question: "Can I get a taxi from Tring station?", answerType: "static", answer: "Yes. The official site says there is a taxi service at Tring Station." },
  { id: 131, question: "Where should I park?", answerType: "dynamic", answer: "IMPORTANT: Parking availability can change. Use the CURRENT official Ideas Fest parking page. Known official parking has included Pendley Manor Hotel, Cow Lane, Tring." },
  { id: 132, question: "Is parking available?", answerType: "dynamic", answer: "Check current official Ideas Fest parking information. Do not assume availability. Never invent parking spaces." },
  { id: 133, question: "Do I need to book parking?", answerType: "dynamic", answer: "Use current official parking information. If the relevant parking option requires pre-booking, tell the user." },
  { id: 134, question: "Do I need a printed ticket?", answerType: "static", answer: "No. The official site says the QR code on your phone is enough." },
  { id: 135, question: "Can I transfer my Ideas Fest ticket?", answerType: "static", answer: "Yes. The official site says you can forward the ticket email to the person receiving the ticket and ensure they have the QR code." },
  { id: 136, question: "Where can I stay near Ideas Fest?", answerType: "static", answer: "The official site mentions accommodation in Tring, Berkhamsted and Aylesbury, with additional options in Hemel Hempstead, Milton Keynes and Watford." },
  { id: 137, question: "Where can I see the map?", answerType: "static", answer: "Use the official Ideas Fest site maps to navigate the zones and spaces." }
];

function getRelevantQA(qaList, userMessage) {
  if (!userMessage) return qaList.slice(0, 25);
  
  const msg = userMessage.toLowerCase();
  const synonyms = {
    'food': ['eat', 'lunch', 'dinner', 'breakfast', 'snack', 'hungry', 'vegetarian', 'vegan', 'burger', 'pizza', 'indian', 'bowl'],
    'drink': ['coffee', 'tea', 'water', 'bar', 'alcohol', 'beer', 'cocktail', 'thirsty', 'cafe', 'refill'],
    'founder': ['startup', 'entrepreneur', 'business', 'co-founder', 'women', 'female'],
    'investor': ['fund', 'pitch', 'deal', 'money', 'capital', 'raise', 'acquisition'],
    'network': ['meet', 'connect', 'talk', 'conversation', 'social', 'mingle'],
    'location': ['where', 'find', 'map', 'near', 'closest', 'far', 'address', 'venue'],
    'time': ['when', 'schedule', 'agenda', 'now', 'next', 'today', 'tonight', 'hour', 'afternoon', 'morning', 'gates', 'close'],
    'work': ['workspace', 'wifi', 'meeting', 'call', 'desk', 'laptop'],
    'wellness': ['relax', 'yoga', 'sauna', 'plunge', 'recovery', 'health', 'ice', 'chill'],
    'travel': ['train', 'station', 'shuttle', 'bus', 'taxi', 'park', 'parking', 'car', 'drive'],
    'ticket': ['book', 'pass', 'qr', 'transfer', 'buy', 'cost']
  };

  const expandedWords = new Set(msg.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  
  for (const [key, related] of Object.entries(synonyms)) {
    if (expandedWords.has(key) || related.some(r => msg.includes(r))) {
      expandedWords.add(key);
      related.forEach(r => expandedWords.add(r));
    }
  }

  const scored = qaList.map(qa => {
    let score = 0;
    const qStr = qa.question.toLowerCase();
    const aStr = qa.answer.toLowerCase();
    
    for (const w of expandedWords) {
      if (qStr.includes(w)) score += 3;
      if (aStr.includes(w)) score += 1;
    }
    
    // Slight boost for foundational time/location questions if they score anything at all
    if (score > 0 && qa.id <= 10) score += 2;
    
    return { ...qa, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 25);
}

function buildIdeasFestAIContext(latitude, longitude, userMessage = "") {
  const londonTimeStr = getLondonTimeContext();
  let locContext = "Location unknown.";
  if (latitude && longitude) {
    locContext = `Lat: ${latitude}, Lon: ${longitude}`;
  }

  const relevantQA = getRelevantQA(IDEAS_FEST_2026_QA, userMessage);
  
  const qaContext = relevantQA.map(item => {
    return `Q: ${item.question}\nType: ${item.answerType}\nA: ${item.answer}`;
  }).join('\n\n');

  return `
[IDEAS FEST 2026 EVENT CONTEXT]
The user is asking a question about Ideas Fest 2026. You are acting as the AI event concierge for this event.
Dates: Wednesday 9 September 2026, Thursday 10 September 2026
Venue: Champneys Tring, Hertfordshire, HP23 6HY
Entrance: Shootersway festival entrance (what3words: ///pirate.croutons.sponsors)
Gates open: 09:00. Main programme: 09:00–18:00. After Dark continues into evening. Site closes: 23:00.
Description: "The Glastonbury for Business" - not a conference. A festival.

[CURRENT LIVE CONTEXT]
Current Date/Time (Europe/London): ${londonTimeStr}
User GPS Coordinates: ${locContext}

[LIVE QUERY RULES]
"today" = current date in Europe/London. "tomorrow" = next day in Europe/London.
"right now" = sessions currently running. "next" = nearest relevant future session.
"next hour" = current London time through current London time + 60 minutes.
"this morning", "this afternoon", "this evening" = morning/afternoon/evening programming for the current event day.
"tonight" = current day's evening/After Dark programme. "after this" = after the selected/current activity.
"later" = relevant future activities on the current day.

[LOCATION RULES]
If GPS exists: Use latitude and longitude for near me/closest/nearby/how far/walking distance.
Use actual distance where coordinates exist.
If GPS is unavailable: Say "I don't have your live location right now. Turn on location to see what's closest."
Never fabricate distances.

[RECOMMENDATION RULES]
When user asks what to do/attend/best:
Consider: current London time, current location, next available session, user's interests, previous conversation, travel/walking time, food/coffee needs, networking goal, event-day schedule.
Do not randomly choose from the Q&A list. Use "One good option is..." or "Based on your interests, I'd recommend...".

[NO-HALLUCINATION RULES]
NEVER invent: speakers, founder status, investor status, nationality, gender, attendees, sessions, prices, menu items, ratings, opening hours, distances, parking availability, booking availability, ticket availability, venue locations, event statistics.
If information is missing: say it is unavailable.
Do NOT claim the official website ranked anything "best" unless explicitly stated.

[CONVERSATION RULES]
The AI must naturally understand variations (e.g. "Anything interesting happening?", "I'm hungry", "I need coffee").
Follow-up context MUST work. Example:
User: "What's happening next?" -> AI returns upcoming.
User: "Which one is about AI?" -> AI filters.
User: "Where is it?" -> AI uses selected session location.
User: "How far is it?" -> AI uses site coordinates.
User: "What should I do after that?" -> AI uses session's end time.
NEVER SOUND LIKE AN AI. Speak entirely like a human concierge.
DO NOT use phrases like "Based on the official data", "As an AI". Keep answers extremely conversational, friendly, and brief.
CRITICAL FORMATTING RULE: DO NOT use ANY Markdown. No asterisks (*), no bold text, no hashtags (#), and no bullet points (-). Provide your answer in pure plain text. Use line breaks (newlines) to structure your response cleanly.

[IDEAS FEST 2026 VERIFIED Q&A KNOWLEDGE]
Use this data as ground truth. This is a partial dataset, not the complete agenda. Use it to answer matching user queries.
${qaContext}
`;
}

module.exports = {
  buildIdeasFestAIContext
};
