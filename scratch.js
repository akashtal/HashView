const fs = require('fs');

const qaData = `
{
  question: "What’s happening at Ideas Fest today?",
  answerType: "dynamic",
  answer: "Ideas Fest 2026 takes place on 9–10 September 2026 at Champneys Tring.\n\nIf the current Europe/London date is before 9 September 2026:\n'Ideas Fest 2026 hasn't started yet. The festival runs 9–10 September at Champneys Tring.'\n\nIf the current London date is 9 September:\nReturn relevant Wednesday 9 September programming from the available Ideas Fest agenda data.\n\nIf the current London date is 10 September:\nReturn relevant Thursday 10 September programming from the available Ideas Fest agenda data.\n\nIf the event has finished:\n'Ideas Fest 2026 has finished. It took place on 9–10 September 2026 at Champneys Tring.'",
  dynamicRule: "Calculate the date using Europe/London."
},
{
  question: "What’s on right now?",
  answerType: "dynamic",
  answer: "This is a LIVE query. Use current Europe/London time.\nReturn official sessions/activities where startTime <= currentTime AND endTime > currentTime.\nIf no currently active session is found: 'There doesn't appear to be an official session running at this exact moment. Here are the nearest upcoming options...'\nDo not claim that the sample sessions in this file are the complete agenda.",
  dynamicRule: "Use current Europe/London time."
},
{
  question: "What events are happening this afternoon?",
  answerType: "dynamic",
  answer: "Use the current Europe/London date and the available official Ideas Fest agenda.\nReturn relevant afternoon sessions and activities for that day.\nIf it is before the event: 'The Ideas Fest programme starts on 9 September.'\nKnown verified Wednesday example: Funding an Acquisition (14:15, The Deal Room)\nKnown verified Wednesday example: Open Mic Pitching & Networking (15:30–16:30, Deep Dive)\nKnown verified Wednesday example: Accessorise with MAKU using leather offcuts (15:45–16:45, Unplugged)\nDo not imply these are the complete afternoon programme."
},
{
  question: "What’s happening tonight?",
  answerType: "dynamic",
  answer: "Wednesday 9 September:\n19:00 — James Haskell\n21:00 — Rick Parfitt Jnr and the RPJ Band\n\nThursday 10 September:\n19:00 — Showhawk Duo\n21:00 — DJ Fat Tony\n\nThe site closes at 23:00.\nUse the current London date to choose Wednesday or Thursday."
},
{
  question: "What are the main events I shouldn’t miss?",
  answerType: "partial",
  answer: "The official Ideas Fest website does not provide an authoritative 'must-see' ranking.\nDo not say: 'These are the official events you shouldn't miss.'\nInstead say: 'The festival doesn't publish an official must-see ranking, but some highlights include...'\nPossible highlighted programming: Simon Squibb — What's Your Dream?, Pitch Perfect, Simon Says: Live Q&A, Open Mic Pitching, The AI Den, DreamBrew Launch Party, James Haskell, Rick Parfitt Jnr, Showhawk Duo, DJ Fat Tony.\nSelect based on the current day and user's interests."
},
{
  question: "What talks are happening today?",
  answerType: "dynamic",
  answer: "Use the official current Ideas Fest agenda for the current London date.\nReturn useful current/relevant talks rather than dumping the entire agenda.\nThe official website provides hundreds of talks and sessions across the festival.\nDo not pretend the small dataset in this file is the complete agenda."
},
{
  question: "Who is speaking today?",
  answerType: "dynamic",
  answer: "Use the official current speaker/agenda data and current London date.\nReturn speakers scheduled for that day where schedule information is available.\nDo not return the entire speaker directory unless the user asks.\nThe official speaker directory contains a very large 2026 lineup."
},
{
  question: "Which talks are happening right now?",
  answerType: "dynamic",
  answer: "LIVE query. Use: startTime <= currentLondonTime AND endTime > currentLondonTime.\nReturn currently active sessions from the available official agenda.\nIf there are no active sessions, show the closest upcoming sessions.\nNever fabricate a current session."
},
{
  question: "What’s happening in the next hour?",
  answerType: "dynamic",
  answer: "LIVE query. Calculate: current London time through current London time + 60 minutes.\nReturn: session/activity, start time, end time if available, speaker if available, location, relevant description.\nSort chronologically. Never invent missing information."
},
{
  question: "What’s the schedule for today?",
  answerType: "dynamic",
  answer: "Use the official Ideas Fest agenda for the current London date.\nReturn the most useful sessions/events for today.\nDo not dump hundreds of records unless explicitly asked for the full schedule."
},
{
  question: "Which founders are at Ideas Fest?",
  answerType: "partial",
  answer: "Ideas Fest brings together thousands of entrepreneurs, founders and business leaders.\nThe official speaker directory contains many founders and business leaders.\nUse verified official profiles when identifying founders. Examples include: Greg Jackson, Thea Green MBE, Spencer Matthews, Simon Squibb, Daniel Priestley, Lottie Whyte, Louise Hill, Pip Jamieson, Wilfred Emmanuel-Jones MBE, Brin Pirathapan, Victoria Prew, Roei Samuel, Vasily Alekseenko, Zac Froud, Ben Newman, Elin Roberts.\nDo not assume every speaker is a founder."
},
{
  question: "Who are the biggest founders here?",
  answerType: "partial",
  answer: "There is no official Ideas Fest ranking of the 'biggest founders.'\nSay: 'If by biggest you mean prominent or widely recognised founders/business leaders in the lineup...'\nPossible examples: Greg Jackson, Thea Green, Spencer Matthews, Simon Squibb, Daniel Priestley, Simon Woodroffe, Michael Acton Smith, Sir Richard Harpin.\nTreat this as an AI recommendation, not an official ranking."
},
{
  question: "Which startup founders should I meet?",
  answerType: "partial",
  answer: "Personalize the answer based on what the user is building.\nFor AI/startup technology: Zac Froud, Piers Linney, Dr Aalok Shukla, Jake Leeming, David Amor, Chris Meah.\nFor funding/networking: Simon Squibb, Daniel Priestley, Roei Samuel, Vasily Alekseenko.\nFor food/food-business: Brin Pirathapan, Wilfred Emmanuel-Jones MBE, Ben Newman, Elin Roberts.\nAlways explain why a person is relevant."
},
{
  question: "Are there any food-tech founders here?",
  answerType: "partial",
  answer: "There are food and food-business founders in the lineup, but the official site does not provide a definitive 'food-tech founders' category.\nRelevant food-business examples include: Brin Pirathapan, Wilfred Emmanuel-Jones MBE, Ben Newman, Elin Roberts, Deepak Ravindran, Aron Gelbard.\nOnly classify someone as specifically 'food-tech' when the official profile/company information supports it."
},
{
  question: "Are there any AI founders here?",
  answerType: "static/partial",
  answer: "Yes.\nA particularly strong verified example is: Zac Froud — founder of advcy.ai.\nHis official Ideas Fest profile lists: 'Problem-Solvers or Prompt-Writers? Original Thinking in the Age of AI' (Wednesday 9 September 13:00–13:45, Greenhouse).\nOther relevant AI people include: Piers Linney, Dr Aalok Shukla, Jake Leeming, David Amor, Chris Meah, Danielle Green, Lucy McCarraher.\nDo not label every AI-related speaker as a founder."
},
{
  question: "Which investors are attending?",
  answerType: "partial",
  answer: "The official website includes investment-related people, but it does not provide one definitive complete public list of every investor attendee.\nVerified investment-related examples include: Dominnique Karetsos, Todd Sullivan, Brian Dukes, Ryan Clark, Pieter Van Rooyen, Lydia Finnegan, Chloe Lambert, Hugh Chappell, Dr Jill Jones.\nUse official profiles to confirm investment roles.\nDo not claim this is the complete investor attendee list."
},
{
  question: "Who should I network with if I’m building a startup?",
  answerType: "partial",
  answer: "Recommend based on the user's startup stage, industry and objective.\nUseful areas: StartUp Zone, Dreamland, The Deal Room, The AI Den, Deep Dive, Camp Fire, Launch Pad, The Ideas Oasis, Purpose Pavilion.\nUse relevant founders/investors from the official speaker information.\nFor an AI startup, prioritize AI-related people and The AI Den.\nFor fundraising, prioritize The Deal Room and investment-related people.\nFor early-stage founder networking, prioritize StartUp Zone and Dreamland."
},
{
  question: "Are there any female founders here?",
  answerType: "static/partial",
  answer: "Yes.\nIdeas Fest has dedicated Ideas By Her programming.\nRelevant spaces include: The Starling Social Club, Women Are Good Business Pavilion, The Unapologetic Space, The Self Revolution Love Bus.\nThe official website describes the Women Are Good Business Pavilion as focusing on female-founded businesses and the capital supporting them.\nUse explicit profile information when identifying individual female founders.\nNever infer gender from names."
},
{
  question: "Which founders are from the UK?",
  answerType: "partial",
  answer: "The official speaker directory does not provide a complete nationality field for every person.\nDo not infer nationality from a person's name.\nUse explicit UK location information where available.\nA safe answer is: 'Yes, many founders and business leaders at Ideas Fest are connected to UK-based businesses, but the official speaker directory doesn't provide a complete nationality field for everyone.'"
},
{
  question: "Where can I meet other entrepreneurs?",
  answerType: "static",
  answer: "Good official networking areas include: StartUp Zone, Dreamland, The Deal Room, Deep Dive, The HoLT, The Big Festoon, The Starling Social Club, Food & Drink Village, Camp Fire, Launch Pad, Purpose Pavilion, The Ideas Oasis, The AI Den.\nThe official site emphasizes informal conversations between sessions as an important part of the festival."
},
{
  question: "Where can I get coffee?",
  answerType: "partial/dynamic",
  answer: "Official coffee options include: Brinkleys Coffee, Rovello Coffee, KitchenAid Airstream & Lounge.\nThe Starling Social Club also has coffee as part of the morning experience.\nUse current location when available to identify the closest option."
},
{
  question: "What’s the best coffee near me?",
  answerType: "dynamic",
  answer: "The official website does not provide an official 'best coffee' ranking.\nUse: user GPS + available site/map location data + available opening/current information.\nThen recommend the closest or most suitable official coffee option.\nKnown coffee options: Brinkleys Coffee, Rovello Coffee, KitchenAid Airstream & Lounge, Starling Social Club.\nNever fabricate distance or rating."
},
{
  question: "Where can I get breakfast?",
  answerType: "partial",
  answer: "The official Food & Drink Village includes traders serving from proper coffee and breakfast through to late-night food.\nPotential official options include: Brinkleys Coffee, Jeco Bowls, Anna Mae's, Get Fed, Tokyo Kitchen, Oyster Buoys, Taste Tibet, Pizza Arti.\nDo not invent exact breakfast menus unless official menu data is available."
},
{
  question: "Where can I get lunch?",
  answerType: "partial/dynamic",
  answer: "The Food & Drink Village provides multiple lunch options.\nExamples include: Jeco Bowls, Anna Mae's, Get Fed, Tokyo Kitchen, Oyster Buoys, Taste Tibet, Pizza Arti, Tapas Bravas, Los Gordos, Well Nice Food, Lorna's Indian Kitchen, Brinkleys Burgers, Funky Elephant, Blanco Nino, Sonny's, The Vegan Patty Lady, Spudman, Bhangra Blends.\nUse user location and preferences when possible."
},
{
  question: "What food is available at Ideas Fest?",
  answerType: "static",
  answer: "Officially listed food traders include: Jeco Bowls, Anna Mae's, Get Fed, Tokyo Kitchen, Oyster Buoys, Brinkleys Coffee, Taste Tibet, Pizza Arti, Tapas Bravas, Los Gordos, Well Nice Food, Lorna's Indian Kitchen, Brinkleys Burgers, Funky Elephant, Blanco Nino, Sonny's, Rovello Coffee, The Vegan Patty Lady, Brew & Beats, Spudman, Bhangra Blends.\nBars: Prime Time Bar, Pimentae.\nThe site says vegan, vegetarian and gluten-free options are available.\nFree water refill points are available.\nThe site is cashless."
},
{
  question: "What are the best food options here?",
  answerType: "partial",
  answer: "The official website does not publish a 'best food' ranking.\nInstead personalize by preference.\nIndian: Lorna's Indian Kitchen, Bhangra Blends.\nVegan: The Vegan Patty Lady.\nBurgers: Brinkleys Burgers.\nPizza: Pizza Arti.\nCoffee: Brinkleys Coffee, Rovello Coffee.\nPotato-based: Spudman.\nUse current official trader information.\nDo not present these as official rankings."
},
{
  question: "Is there vegetarian food?",
  answerType: "static",
  answer: "Yes.\nThe official Ideas Fest site says vegetarian options are available across the site.\nIt also says vegan and gluten-free options are available."
},
{
  question: "Is there Indian food nearby?",
  answerType: "dynamic",
  answer: "Yes.\nOfficial food traders include: Lorna's Indian Kitchen, Bhangra Blends.\nIf the user says 'nearby', use current location/site-map information to determine proximity."
},
{
  question: "Where can I get something quick to eat?",
  answerType: "dynamic",
  answer: "Useful Food & Drink Village options include: Pizza Arti, Spudman, Lorna's Indian Kitchen, Bhangra Blends, Brinkleys Burgers, The Vegan Patty Lady, Jeco Bowls, Taste Tibet.\nUse actual location when available.\nDo not claim exact waiting time or queue length unless real-time data exists."
},
{
  question: "Where can I get food under £10?",
  answerType: "static",
  answer: "The official Ideas Fest website does not publish complete reliable menu pricing for all food traders.\nTherefore answer: 'The official Ideas Fest site lists the food traders but doesn't publish complete menu pricing, so I can't reliably confirm which meals are under £10 from the official information.'\nNever guess prices."
},
{
  question: "Where can I get a good dessert?",
  answerType: "partial",
  answer: "The official Ideas Fest website does not provide a complete authoritative dessert list or official dessert ranking.\nDo not invent a dessert recommendation.\nIf verified current menu/trader data contains a dessert, use it.\nOtherwise say that the official site doesn't provide enough information to confirm a specific dessert."
},
{
  question: "What’s near me right now?",
  answerType: "dynamic",
  answer: "This is a location + time query.\nUse: current GPS + current Europe/London time + available site-map data + current agenda + food + coffee + networking + activities + entertainment.\nRank by real distance when coordinates are available.\nDo not fabricate distance."
},
{
  question: "What restaurants are nearby?",
  answerType: "dynamic",
  answer: "Inside Ideas Fest: use the official Food & Drink Village trader list.\nOutside Ideas Fest: only use the application's existing nearby-business capability if it exists.\nDo not pretend the official Ideas Fest website is a complete external restaurant directory."
},
{
  question: "What’s the best place to eat near Ideas Fest?",
  answerType: "dynamic",
  answer: "Determine whether the user means inside the festival or outside the festival.\nInside: use official Food & Drink Village traders.\nOutside: use trusted nearby-business data if the app already supports it.\nThere is no official Ideas Fest 'best restaurant' ranking.\nUse verified distance, opening status, food preference, price, ratings only when available.\nNever invent these."
},
{
  question: "Where can I go for a drink after the event?",
  answerType: "dynamic",
  answer: "Inside the festival: Prime Time Bar, Pimentae.\nThe evening entertainment also runs until late and the site closes at 23:00.\nFor Wednesday: James Haskell — 19:00, Rick Parfitt Jnr and the RPJ Band — 21:00\nFor Thursday: Showhawk Duo — 19:00, DJ Fat Tony — 21:00\nIf the user means outside Ideas Fest, use nearby-business data if available."
},
{
  question: "What’s the best place nearby to network over coffee?",
  answerType: "dynamic/partial",
  answer: "Strong official on-site options include: KitchenAid Airstream & Lounge, The Starling Social Club, Female Founders Unfiltered, The HoLT, The Big Festoon, Food & Drink Village.\nThe KitchenAid Airstream & Lounge is specifically described as having proper coffee and soft seating for founders.\nUse location and current availability when available.\nDo not claim there is an official 'best' ranking."
},
{
  question: "What should I do next?",
  answerType: "dynamic",
  answer: "This is a contextual recommendation.\nUse: current London time, current location, current/last session, upcoming sessions, user interests, previous conversation, networking goals, food/coffee needs, available time, distance.\nExamples:\nIf an AI session starts soon and the user is interested in AI: recommend that AI session.\nIf the user wants investors: recommend The Deal Room or relevant investment sessions.\nIf the user wants founders: recommend StartUp Zone, Dreamland or relevant networking.\nIf the user has 30 minutes: only recommend activities that realistically fit.\nDo not invent schedule or distance."
},
{
  question: "When is Ideas Fest 2026?",
  answerType: "static",
  answer: "Ideas Fest 2026 takes place on 9–10 September 2026."
},
{
  question: "Where is Ideas Fest 2026?",
  answerType: "static",
  answer: "Champneys Tring\nShooters Way\nTring\nHertfordshire\nHP23 6HY\n\nwhat3words: ///pirate.croutons.sponsors"
},
{
  question: "What time do the gates open?",
  answerType: "static",
  answer: "The festival gates open at 9:00 AM."
},
{
  question: "What time does Ideas Fest close?",
  answerType: "static",
  answer: "The site closes at 11:00 PM."
},
{
  question: "Is Ideas Fest a conference?",
  answerType: "static",
  answer: "Ideas Fest describes itself as a festival rather than a conventional conference.\nIt combines talks and sessions with networking, workshops, food and drink, wellbeing activities, music, DJs, fire pits and evening entertainment."
},
{
  question: "How many sessions are there at Ideas Fest?",
  answerType: "static",
  answer: "The official site describes the 2026 programme as having 500+ talks and sessions across two days.\nDo not claim that this number is an exact audited total beyond what the official site states."
},
{
  question: "How many speakers are at Ideas Fest?",
  answerType: "static",
  answer: "The official speaker page describes over 500 speakers across the two days.\nUse the current official speaker page if an exact current count is required."
},
{
  question: "Who is the keynote speaker?",
  answerType: "static",
  answer: "Simon Squibb has the headline keynote:\n'What's Your Dream?'\nWednesday 9 September\n12:30–13:00\nDreamland: The Inspiration Stage"
},
{
  question: "Who is speaking about AI?",
  answerType: "dynamic",
  answer: "Relevant AI people include: Zac Froud — ADVCY, Piers Linney — Implement AI, Dr Aalok Shukla — Implement AI, Jake Leeming — WiseMind AI, David Amor — Ensobrain, Chris Meah — Meah Labs, Danielle Green — Director of Tech & AI Strategy, Lucy McCarraher — Book Magic AI.\nUse the current agenda to determine who is speaking about AI on the requested day/time."
},
{
  question: "What is The AI Den?",
  answerType: "static",
  answer: "The AI Den is an Ideas Fest 2026 area dedicated to AI, including conversations, live demos and practical applications of AI.\nThe official site describes AI use cases including sales, operations and customer experience."
},
{
  question: "Where is the startup area?",
  answerType: "static",
  answer: "The StartUp Zone is the dedicated area for early-stage founders.\nIts listed spaces include: The Xero Stage, Camp Fire, Launch Pad, Tool Shed, Innovation Base Camp, Purpose Pavilion, The Swap Shop, The Franchise Launchpad, The Ideas Oasis."
},
{
  question: "Where can I meet investors?",
  answerType: "dynamic",
  answer: "Start with: The Deal Room and investment/funding-related sessions.\nThe official site also includes investment-related speakers and founder/funder programming.\nUse the current agenda to identify the next relevant investor/funding session."
},
{
  question: "Where can I pitch my startup?",
  answerType: "dynamic",
  answer: "Ideas Fest includes pitching opportunities such as: Pitch Perfect | Powered by the Dream Fund, and Open Mic Pitching & Networking.\nOpen Mic Pitching & Networking is designed around 60-second pitches to founders, investors and connectors.\nUse the current agenda for exact times."
},
{
  question: "What is Open Mic Pitching & Networking?",
  answerType: "static",
  answer: "It is a 60-second pitching and networking format where you can pitch your vision to a room of founders, investors and connectors.\nA confirmed Wednesday session is: 15:30–16:30 Deep Dive"
},
{
  question: "What is Dreamland?",
  answerType: "static",
  answer: "Dreamland is a space for dreamers to find people who can help, gain knowledge, pitch ideas and potentially meet a co-founder, first customer or mentor.\nIt contains: The Acorn Stage, The Inspiration Stage, Doorbell of Dreams."
},
{
  question: "What is the StartUp Zone?",
  answerType: "static",
  answer: "The StartUp Zone is a dedicated space for early-stage founders looking for first customers, first hires, practical support and momentum."
},
{
  question: "What is Growth Village?",
  answerType: "static",
  answer: "Growth Village is designed for operators scaling beyond the early stage, with sessions around systems, capital, hiring and the difficult decisions involved in scaling a business.\nSpaces include: Greenhouse, IronMarket Finance & Growth Tent, The Boardroom Powered by CEO Friend, The AI Den, The Fineprint, The Engine Room, The Deal Room, The Growth Lounge, Exit Lounge."
},
{
  question: "Is there a women's founder area?",
  answerType: "static",
  answer: "Yes.\nIdeas Fest has: Ideas By Her with spaces including: The Starling Social Club, Women Are Good Business Pavilion, The Unapologetic Space, The Self Revolution Love Bus, Curl Jar."
},
{
  question: "Is there a place to relax or recover?",
  answerType: "static",
  answer: "Yes.\nThe Founder Recovery Zone includes: Zoky Saunascape, Wood-Fired Sauna, Chilled Plunge Pools, Sunrise Yoga, The Human Regenerator, Unplugged, IV Drips, The Sober Bar, The Brewin Basecamp.\nThe official site describes Zoky Saunascape as a wood-fired sauna and chilled filtered plunge pool area."
},
{
  question: "Can I book workshops or activities?",
  answerType: "static",
  answer: "Yes.\nThe official site says selected workshops, clinics and small-group sessions can be booked in advance.\nThey are included with a festival pass but have limited capacity.\nThe current booking page lists 22 activities that can be booked.\nTicket holders need to book their pass first and then claim available spaces."
},
{
  question: "What activities can I book?",
  answerType: "dynamic",
  answer: "The official booking system includes bookable activities across: Deep Dive, The Fineprint, The Founder Coaching Room, The Wealth Vault, Unplugged, Zoky Saunascape.\nThe booking page currently says there are 22 activities available to book.\nUse current booking data for exact availability."
},
{
  question: "Is there yoga?",
  answerType: "static",
  answer: "Yes.\nSunrise Yoga runs on Day 2.\nThe official site describes it as an 8:00 AM flow on Thursday 10 September.\nIt should not be described as running both days."
},
{
  question: "Is there a sauna?",
  answerType: "static",
  answer: "Yes.\nThe Founder Recovery Zone includes: Zoky Saunascape, Wood-Fired Sauna, Chilled Plunge Pools.\nZoky Saunascape is open from 9:00 AM both days according to the official site.\nSome recovery activities require booking."
},
{
  question: "Is there free water?",
  answerType: "static",
  answer: "Yes.\nThe official site says free water refill points are available throughout the site."
},
{
  question: "Is the festival cashless?",
  answerType: "static",
  answer: "Yes.\nThe Ideas Fest site is cashless."
},
{
  question: "Can I get food and drinks onsite?",
  answerType: "static",
  answer: "Yes.\nThe Food & Drink Village has independent food traders, coffee, breakfast, lunch, late-night food and two bars.\nThe bars are: Prime Time Bar, Pimentae."
},
{
  question: "Is there vegan food?",
  answerType: "static",
  answer: "Yes.\nThe official site says vegan options are available across the site."
},
{
  question: "Is there gluten-free food?",
  answerType: "static",
  answer: "Yes.\nThe official site says gluten-free options are available across the site."
},
{
  question: "Is there Indian food?",
  answerType: "static",
  answer: "Yes.\nOfficial traders include: Lorna's Indian Kitchen, Bhangra Blends."
},
{
  question: "Where can I get drinks?",
  answerType: "dynamic",
  answer: "Inside the festival: Prime Time Bar, Pimentae.\nUse the current event schedule and location data when answering time/location-specific drink questions."
},
{
  question: "Is parking available?",
  answerType: "dynamic",
  answer: "Onsite parking has sold out.\nThe current official parking information says overspill parking is available at: Pendley Manor Hotel, Cow Lane, Tring. Price: £35 for the whole festival.\nThe official site states there are 300 overspill spaces and a free shuttle to/from the festival.\nAvailability can change, so use current official parking data when possible."
},
{
  question: "Where should I park?",
  answerType: "dynamic",
  answer: "Use the current official parking information.\nAt the latest official update: Onsite parking is sold out. Overspill parking is at Pendley Manor Hotel, Cow Lane, Tring. There is a free shuttle to and from the festival.\nDo not tell users to park onsite unless current official information says onsite parking is available."
},
{
  question: "How do I get to Ideas Fest from Tring Station?",
  answerType: "dynamic",
  answer: "On Wednesday and Thursday, double-decker buses leave Tring Train Station from 8:30 AM. They run until 10:30 AM.\nAfter that, a smaller shuttle service is available on a first-come, first-served basis.\nThere is also a taxi service at Tring Station.\nUse the latest official getting-here information."
},
{
  question: "Do I need to book the shuttle from Tring Station?",
  answerType: "static",
  answer: "The official site says the festival buses from Tring Station do not require booking.\nThe smaller shuttle after the morning double-deckers is first come, first served."
},
{
  question: "Where can I stay near Ideas Fest?",
  answerType: "dynamic",
  answer: "On-site accommodation is for people who have already booked it.\nThe official site points to hotels and rentals in: Tring, Berkhamsted, Aylesbury, with further options in: Hemel Hempstead, Milton Keynes, Watford.\nUse the official accommodation page for current availability."
},
{
  question: "Do I need a printed ticket?",
  answerType: "static",
  answer: "No.\nThe official site says you do not need a printed ticket.\nThe QR code on your phone is enough.\nTickets are emailed from Ticket Tailor."
},
{
  question: "Can I transfer my Ideas Fest ticket?",
  answerType: "static",
  answer: "Yes.\nThe official site says you can forward the ticket email to the person receiving the ticket and make sure they have the QR code with them on arrival."
},
{
  question: "Where can I find the festival map?",
  answerType: "dynamic",
  answer: "Ideas Fest provides official site maps and an agenda organized by day, time and space.\nUse the official site-map/agenda data when location information is needed."
},
{
  question: "What is The Big Festoon?",
  answerType: "static",
  answer: "The Big Festoon is an informal festival gathering space focused on business and personal development, with opportunities to talk and connect between sessions."
},
{
  question: "What is The HoLT?",
  answerType: "static",
  answer: "The HoLT is a quieter corner of the festival for slower conversations, small groups and moments between sessions."
},
{
  question: "What is the Food & Drink Village?",
  answerType: "static",
  answer: "It is the main festival food-and-drink area with independent traders, two bars, coffee, breakfast, lunch and late-night food.\nIt also provides informal networking opportunities."
},
{
  question: "What is the Great British Build-Off?",
  answerType: "static",
  answer: "It is an Ideas Fest competition where participants can take an idea they have never started, register, and build it live on Macaly AI in 90 minutes.\nPrize: £5,000 plus up to 200 million Macaly AI credits."
},
{
  question: "What is the Hydration Station?",
  answerType: "static",
  answer: "The Hydration Station is an Ideas Fest area where attendees can ask TikTok questions, get hydrated and talk with TikTok team members between sessions."
},
{
  question: "What is Love SAMBA?",
  answerType: "static",
  answer: "SAMBA stands for: Sales, Automation, Marketing, Branding, AI.\nThe Love SAMBA area provides practical sessions and live clinics around sales and marketing problems."
},
{
  question: "Is there a place to work at Ideas Fest?",
  answerType: "dynamic",
  answer: "The official Ideas Fest site provides an onsite workspace option.\nUse the current official Onsite Workspace information for details rather than inventing facilities or opening hours."
},
{
  question: "Can I get coffee before the talks start?",
  answerType: "static",
  answer: "Yes.\nThe festival opens at 9:00 AM and official morning options include: Brinkleys Coffee, Rovello Coffee, KitchenAid Airstream & Lounge, Starling Social Club.\nThe Starling Social Club hosts the morning Starter Party with DJ Vinyl Jen."
},
{
  question: "What happens first thing in the morning?",
  answerType: "static",
  answer: "Both days open at 9:00 AM with the Starter Party with DJ Vinyl Jen at The Starling Social Club.\nThe festival also has morning wellness options such as saunas, cold plunges and, on Day 2, Sunrise Yoga at 8:00 AM."
},
{
  question: "What happens after the daytime programme?",
  answerType: "static",
  answer: "The festival continues into the evening with: fire pits, DJs, live music, networking, evening entertainment.\nWednesday: James Haskell — 19:00, Rick Parfitt Jnr and the RPJ Band — 21:00\nThursday: Showhawk Duo — 19:00, DJ Fat Tony — 21:00\nThe site closes at 23:00."
}
];

const jsContent = \`function getLondonTimeContext() {
  const now = new Date();
  const options = { timeZone: 'Europe/London', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    return formatter.format(now);
  } catch (err) {
    return now.toUTCString() + ' (Fallback timezone)';
  }
}

const IDEAS_FEST_2026_QA = \${JSON.stringify(qaData, null, 2)};

function buildIdeasFestAIContext(latitude, longitude) {
  const londonTimeStr = getLondonTimeContext();
  let locContext = "Location unknown.";
  if (latitude && longitude) {
    locContext = \`Lat: \${latitude}, Lon: \${longitude}\`;
  }

  const qaContext = IDEAS_FEST_2026_QA.map(item => {
    return \`Q: \${item.question}\\nType: \${item.answerType}\\n\${item.dynamicRule ? "Rule: " + item.dynamicRule + "\\n" : ""}A: \${item.answer}\`;
  }).join('\\n\\n------------------------\\n\\n');

  return \`
[IDEAS FEST 2026 EVENT CONTEXT]
The user is asking a question about Ideas Fest 2026. You are acting as the AI event concierge for this event.

[CURRENT LIVE CONTEXT]
Current Date/Time (Europe/London): \${londonTimeStr}
User GPS Coordinates: \${locContext}
Site: Champneys Tring, Shooters Way, Tring, Hertfordshire, HP23 6HY (what3words: ///pirate.croutons.sponsors)
Gates open: 9:00 AM, Site closes: 11:00 PM

[IDEAS FEST 2026 LIVE QUERY RULES]
1. "right now" means happening at exactly the Current Date/Time provided.
2. "today" means the current date in Europe/London.
3. "next hour" means the rolling 60-minute period starting from the current Europe/London time.
4. "this afternoon" means the relevant afternoon programming on the current event day.
5. "tonight" means the relevant evening/After Dark programme on the current event day.
6. Before 9 September 2026: The festival hasn't started. 9 Sep: Day 1. 10 Sep: Day 2. After 10 Sep: The festival is over.

[IDEAS FEST 2026 LOCATION QUERY RULES]
For near me/nearby/closest questions, use the provided GPS coordinates. If unavailable, do not invent distance. Say: "I don't have your live location right now. Turn on location to see what's closest."

[IDEAS FEST 2026 NO-HALLUCINATION RULES]
1. Never invent sessions, speakers, founders, investors, food traders, prices, menus, distances, opening times, ratings, gender, or nationality.
2. If asked for recommendations, use the provided lists. Do not say "The best..." as an official ranking. Say "One good option is..."
3. The festival is cashless. Free water is available.
4. NEVER SOUND LIKE AN AI. Speak entirely like a human concierge.
   - DO NOT use phrases like "Based on the official data", "As an AI", or "According to my information."
   - Keep answers extremely conversational, friendly, and brief.
   - Avoid excessive bullet points unless listing an agenda.
   - Answer naturally. Preserve conversational flow (understand "it", "next", "after that").

[IDEAS FEST 2026 VERIFIED Q&A]
Use this data as ground truth. This is a partial dataset, not the complete agenda. If the user asks something covered here, follow the guidance exactly.

\${qaContext}
\`;
}

module.exports = {
  buildIdeasFestAIContext
};
\`;

fs.writeFileSync('backend/ai-gateway/pipeline/ideasFestContext.js', jsContent);
