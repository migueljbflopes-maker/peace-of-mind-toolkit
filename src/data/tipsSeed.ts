export interface TipContent {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  topics: string[];
  audience: string[];
  offlineReady: boolean;
  contentMarkdown: string;
}

export const tipsContent: TipContent[] = [
  {
    slug: "quick-start-15min",
    title: "Your 15-minute calm start",
    summary: "A gentle introduction to preparedness that won't overwhelm you.",
    minutes: 15,
    topics: ["Getting Started"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Why 15 minutes matters
Starting small removes the mental barrier. You don't need to do everything today.

## What to do right now
- Fill a few water bottles and store them somewhere cool
- Check that you have a working flashlight with batteries
- Save emergency contacts in your phone (and write them on paper)
- Locate your home's water shut-off valve

## Quick wins checklist
- [ ] 6 liters of water stored
- [ ] Flashlight tested
- [ ] Emergency contacts written down
- [ ] Know where shut-off valves are

## What's next
You've started. That's the hardest part. Tomorrow, check your pantry for 3-day food supplies.

**Next step:** Take the 2-minute risk check to see what matters most for your situation.`
  },
  {
    slug: "essentials-72h-vs-14d",
    title: "72 hours vs 14 days: what to prioritize",
    summary: "Understand the difference and build your supplies step by step.",
    minutes: 8,
    topics: ["Planning", "Supplies"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## The 72-hour baseline
Most emergencies are resolved within 3 days. This is your minimum target.

### 72-hour essentials
- 9 liters of water per person
- Ready-to-eat food for 3 days
- Flashlight + batteries
- First aid basics
- Phone charger / power bank
- Cash in small bills

## When 14 days makes sense
Extended disruptions (infrastructure damage, supply chain issues) may require more.

### Additional for 14 days
- 42 liters of water per person (or purification method)
- Shelf-stable food variety
- Cooking without power option
- Hygiene supplies for 2 weeks
- Medications buffer

## Prioritization checklist
- [ ] Complete 72-hour kit first
- [ ] Add water purification for extended scenarios
- [ ] Build food variety gradually
- [ ] Consider household-specific needs

**Next step:** Use the 14-day supplies planner to build your personalized list.`
  },
  {
    slug: "water-made-simple",
    title: "Water planning made simple",
    summary: "How much water you need and the easiest ways to store it.",
    minutes: 6,
    topics: ["Water", "Supplies"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## How much water do you need?
The standard is 3 liters per person per day (drinking + basic hygiene).

### Quick math
- 72 hours: 9 liters/person
- 14 days: 42 liters/person
- Family of 4 for 14 days: ~170 liters

## Storage options
- **Tap water in clean bottles**: Free, replace every 6 months
- **Store-bought water**: Convenient, longer shelf life
- **Large containers (5-20L)**: Space-efficient

## Purification backup
- Water purification tablets (lightweight, cheap)
- Portable filter (good for longer scenarios)
- Boiling (requires fuel/power)

## Water checklist
- [ ] Calculate your household's 72h need
- [ ] Store at least the 72h minimum
- [ ] Add one purification method
- [ ] Mark a reminder to rotate in 6 months

**Next step:** Check the supplies planner for your complete water calculation.`
  },
  {
    slug: "pantry-basics",
    title: "Shelf-stable food basics (without overspending)",
    summary: "Build a practical food buffer using everyday items.",
    minutes: 7,
    topics: ["Food", "Supplies", "Budget"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## The "pantry rotation" approach
Buy a little extra of what you already eat. Use the oldest first, replace regularly.

## Shelf-stable staples
- Canned beans, vegetables, fish
- Pasta, rice, oats
- Peanut butter, honey
- Crackers, dried fruit
- UHT milk or plant milk
- Instant coffee/tea

## No-cook options (power outage friendly)
- Canned meals (ready to eat)
- Nut butter + crackers
- Dried fruit and nuts
- Energy bars

## Avoid common mistakes
- Don't buy food you won't eat
- Check expiration dates when shopping
- Store in cool, dry place
- Consider dietary restrictions

## Food checklist
- [ ] 3 days of no-cook food per person
- [ ] Manual can opener
- [ ] Check expiration dates monthly
- [ ] Rotation system in place

**Next step:** Use the supplies planner to calculate exactly what you need.`
  },
  {
    slug: "power-cuts",
    title: "Power cuts: a calm checklist",
    summary: "What to do before, during, and after a power outage.",
    minutes: 5,
    topics: ["Power", "Emergency Response"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Before (prepare now)
- Flashlights in accessible spots (not just one)
- Spare batteries or rechargeable options
- Power bank charged for phone
- Know how to manually open garage door
- Freeze water bottles (keeps freezer cold longer)

## During a power cut
1. Check if it's just your home or the area
2. Unplug sensitive electronics
3. Keep fridge/freezer closed
4. Use flashlights, not candles if possible
5. Check on vulnerable neighbors

## Fridge/freezer timing
- Fridge: safe for ~4 hours if closed
- Freezer: 24-48 hours if full, less if half-full

## After power returns
- Check food safety (when in doubt, throw it out)
- Reset clocks and timers
- Recharge all devices

## Power cut checklist
- [ ] Flashlight per room
- [ ] Power bank charged
- [ ] Know your fuse box
- [ ] Frozen water bottles in freezer

**Next step:** Check if you have a backup charging solution for extended outages.`
  },
  {
    slug: "communications-plan",
    title: "Family communication plan in 10 minutes",
    summary: "A simple system so everyone knows what to do and who to call.",
    minutes: 10,
    topics: ["Communication", "Family"],
    audience: ["Families"],
    offlineReady: true,
    contentMarkdown: `## Why you need a plan
During emergencies, phones may be busy or you may be separated. A simple plan removes confusion.

## The basics
1. **Out-of-area contact**: Someone outside your region who can relay messages
2. **Meeting points**: One near home, one outside neighborhood
3. **Check-in protocol**: Who calls whom, and when

## Create your contact card
Write down (paper survives when phones don't):
- Family members' phones
- Out-of-area contact
- Work/school addresses
- Medical info
- Meeting points

## Digital backup
- Save contacts with "ICE" prefix (In Case of Emergency)
- Share a family note/document with key info
- Consider a family group chat for quick updates

## Communication checklist
- [ ] Out-of-area contact identified
- [ ] Two meeting points chosen
- [ ] Contact cards written (one per person)
- [ ] Kids know the plan (age-appropriate)

**Next step:** Store a copy of your plan in the Red Folder format for offline access.`
  },
  {
    slug: "documents-basics",
    title: "Documents: what to copy and how to store",
    summary: "Protect your important documents with simple backups.",
    minutes: 8,
    topics: ["Documents", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Essential documents to copy
- ID cards / passports
- Insurance policies (home, health, car)
- Property deeds / rental agreements
- Medical records / prescriptions
- Bank account info
- Emergency contacts list

## Storage options

### Physical copies
- Waterproof folder or bag
- Fireproof safe (if budget allows)
- Trusted family member's home

### Digital copies
- Encrypted cloud storage
- USB drive (stored separately from originals)
- Password-protected folder

## Keep it simple
You don't need every document — focus on what you'd need if you had to leave quickly or prove your identity.

## Documents checklist
- [ ] IDs copied
- [ ] Insurance info accessible
- [ ] Medical records summarized
- [ ] Stored in 2 locations (physical + digital)

**Next step:** Include your document copies in your personalized Red Folder plan.`
  },
  {
    slug: "cash-basics",
    title: "Cash on hand: a practical approach",
    summary: "Why and how much cash to keep for emergencies.",
    minutes: 4,
    topics: ["Finance", "Supplies"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Why cash matters
When power or internet is down, cards don't work. Cash keeps you mobile.

## How much to keep
- **Minimum**: Enough for 3 days of essentials (food, fuel, transport)
- **Comfortable**: 1-2 weeks of basic expenses
- **Consider**: Small bills and coins (change may be hard to get)

## Where to store it
- At home: Hidden but accessible (not obvious spots)
- Grab bag: Small amount for immediate needs
- Split locations: Don't keep all in one place

## Practical tips
- Include coins for vending machines / parking
- Check periodically that it's still there
- Replace if you use it

## Cash checklist
- [ ] 3-day minimum calculated
- [ ] Small bills and coins included
- [ ] Stored in 2 locations
- [ ] Family knows where (or one trusted person)

**Next step:** Add cash to your emergency kit alongside other essentials.`
  },
  {
    slug: "first-aid-basics",
    title: "First aid basics for non-experts",
    summary: "A simple kit and the few skills that matter most.",
    minutes: 7,
    topics: ["Health", "Supplies"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## You don't need to be a medic
Basic first aid covers 90% of common situations. Focus on what's practical.

## Essential kit contents
- Adhesive bandages (various sizes)
- Sterile gauze pads
- Medical tape
- Antiseptic wipes
- Tweezers
- Pain relievers (ibuprofen, paracetamol)
- Antihistamines
- Disposable gloves

## Skills worth learning
1. **Stop bleeding**: Apply pressure with clean cloth
2. **Clean a wound**: Rinse with clean water, apply antiseptic
3. **Recognize serious signs**: Difficulty breathing, chest pain, unresponsiveness → call emergency services

## When to seek help
Don't hesitate to call emergency services for:
- Heavy bleeding that won't stop
- Suspected broken bones
- Breathing difficulties
- Loss of consciousness

## First aid checklist
- [ ] Basic kit assembled
- [ ] Know how to stop bleeding
- [ ] Emergency number saved
- [ ] Kit location known by family

**Next step:** Check your supplies planner for complete health supplies.`
  },
  {
    slug: "meds-and-prescriptions",
    title: "Medications: refill rhythm and storage",
    summary: "Keep essential medications available without hoarding.",
    minutes: 5,
    topics: ["Health", "Planning"],
    audience: ["Medical Needs"],
    offlineReady: true,
    contentMarkdown: `## The buffer approach
Aim for a 2-week buffer of essential medications. Refill when you have 2 weeks left, not when you run out.

## Talk to your doctor
- Ask about emergency refill policies
- Request written prescriptions (paper backup)
- Discuss travel/emergency supply allowances

## Storage matters
- Keep in original containers
- Store in cool, dry place (not bathroom)
- Check expiration dates quarterly
- Note special requirements (refrigeration, light-sensitive)

## Create a medication list
For each person:
- Medication name and dosage
- What it's for
- Prescribing doctor
- Pharmacy contact

## Medication checklist
- [ ] 2-week buffer maintained
- [ ] Written prescription copies
- [ ] Medication list created
- [ ] Storage conditions checked

**Next step:** Add your medication list to your family's emergency documents.`
  },
  {
    slug: "kids-kit",
    title: "Preparedness with kids (simple, non-scary)",
    summary: "How to prepare with children without creating anxiety.",
    minutes: 8,
    topics: ["Family", "Planning"],
    audience: ["Kids"],
    offlineReady: true,
    contentMarkdown: `## The right tone
Preparedness is about being ready, not being scared. Frame it as a family project.

## Age-appropriate involvement
- **Young kids**: Help pack snacks, choose a comfort item
- **Older kids**: Learn to use flashlight, memorize phone numbers
- **Teens**: Understand the family plan, help younger siblings

## Kid-specific supplies
- Comfort items (stuffed toy, blanket)
- Entertainment (books, small games — no batteries needed)
- Snacks they actually like
- Change of clothes
- Any special items (diapers, formula, favorite cup)

## Practice makes calm
- Practice finding flashlights in the dark (make it a game)
- Walk to meeting points together
- Quiz phone numbers casually
- Normalize the "what if" conversation

## Kids checklist
- [ ] Comfort item identified
- [ ] Emergency contacts memorized (age-appropriate)
- [ ] Kid-friendly snacks in kit
- [ ] Meeting point practiced

**Next step:** Use the supplies planner to include kid-specific items.`
  },
  {
    slug: "pets-kit",
    title: "Preparedness with pets",
    summary: "Include your pets in your emergency planning.",
    minutes: 6,
    topics: ["Pets", "Planning"],
    audience: ["Pets"],
    offlineReady: true,
    contentMarkdown: `## Pets need a plan too
In an emergency, you may need to shelter in place or evacuate with your pets.

## Pet emergency kit
- Food and water for 3-14 days
- Medications and medical records
- Collar with ID tags
- Leash, harness, carrier
- Recent photo (in case of separation)
- Familiar item (blanket, toy)
- Waste bags / litter

## Important documents
- Vaccination records
- Microchip number
- Vet contact info
- Pet insurance (if applicable)

## Evacuation considerations
- Know pet-friendly shelters/hotels in advance
- Practice carrier/crate time
- Have a neighbor who can help if you're not home
- Never leave pets behind in an evacuation order

## Pets checklist
- [ ] Pet food stored (3-day minimum)
- [ ] Carrier accessible
- [ ] ID tags and microchip current
- [ ] Pet-friendly shelter identified

**Next step:** Add pet supplies to your household supplies plan.`
  },
  {
    slug: "apartment-vs-house",
    title: "Apartment vs house: different priorities",
    summary: "Tailored tips based on where you live.",
    minutes: 6,
    topics: ["Housing", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Apartment considerations

### Challenges
- Less storage space
- Dependent on building systems (elevator, water pressure)
- May need to evacuate via stairs

### Priorities
- Compact, vertical storage solutions
- Know your building's emergency plan
- Stair route practiced (especially high floors)
- Water storage in smaller containers

## House considerations

### Advantages
- More storage space
- Direct access to outdoors
- Potentially more self-sufficient

### Priorities
- Know your utility shut-offs (water, gas, electric)
- Secure outdoor items before storms
- Consider backup heating/cooling
- Garden space for extended scenarios

## Universal priorities
- Water and food regardless of space
- Flashlights and power backup
- Communication plan
- Important documents accessible

## Housing checklist
- [ ] Storage solution for your space
- [ ] Building/home evacuation route known
- [ ] Utility shut-offs located
- [ ] Neighbor contact for mutual aid

**Next step:** Take the risk calculator for location-specific recommendations.`
  },
  {
    slug: "travel-basics",
    title: "Travel disruption checklist",
    summary: "What to pack and know for unexpected travel delays.",
    minutes: 5,
    topics: ["Travel", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Always carry
- Phone + charger + power bank
- Medications (in carry-on if flying)
- Cash in local currency
- ID and travel documents (copies too)
- Basic snacks
- Water bottle

## Before you go
- Share itinerary with someone at home
- Know embassy/consulate location (international travel)
- Save offline maps
- Check travel advisories

## During disruption
- Stay calm — most delays resolve
- Check official channels for updates
- Keep phone charged (priority)
- Know your rights (airline, rail, etc.)

## Extended delays
- Find reliable power source
- Locate safe rest area
- Stay hydrated and fed
- Check in with home contact

## Travel checklist
- [ ] Power bank charged
- [ ] Medications in carry-on
- [ ] Offline maps downloaded
- [ ] Emergency contacts accessible

**Next step:** Check the risk calculator if traveling to new regions.`
  },
  {
    slug: "mental-load",
    title: "Reduce mental load: one list, one place",
    summary: "Simplify your preparedness to reduce stress, not add to it.",
    minutes: 4,
    topics: ["Planning", "Mental Health"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## The problem with scattered plans
Multiple lists, apps, and notes create confusion. In an emergency, simplicity wins.

## One source of truth
- Choose ONE place for your emergency info
- Paper works (survives power outage)
- Digital backup is fine, but paper is primary

## What belongs in your plan
- Emergency contacts
- Meeting points
- Key household info
- Supplies checklist
- Medical info

## Review rhythm
- Set a calendar reminder (monthly or quarterly)
- 10-minute review is enough
- Update what's changed, skip what hasn't

## Mental load checklist
- [ ] Single plan location chosen
- [ ] Family knows where it is
- [ ] Review reminder set
- [ ] Digital backup made

**Next step:** The Red Folder format gives you a printable single source of truth.`
  },
  {
    slug: "neighbor-plan",
    title: "A simple neighbor check-in plan",
    summary: "Build community resilience with minimal effort.",
    minutes: 5,
    topics: ["Community", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Why neighbors matter
In many emergencies, neighbors are first responders. Knowing who's nearby helps everyone.

## Start simple
- Introduce yourself if you haven't
- Exchange phone numbers
- Identify who might need extra help (elderly, mobility issues, small children)

## Create a check-in signal
- Agree on a simple signal ("if you're okay, put a towel in the window")
- Know who checks on whom
- Don't overcomplicate it

## Mutual aid basics
- Share skills and resources (who has tools, medical training, etc.)
- Agree to watch each other's homes during evacuation
- Consider a neighborhood group chat

## Neighbor checklist
- [ ] Know 2-3 neighbors by name
- [ ] Phone numbers exchanged
- [ ] Vulnerable neighbors identified
- [ ] Simple check-in system agreed

**Next step:** Include neighbor contacts in your emergency contact list.`
  },
  {
    slug: "low-budget",
    title: "Preparedness on a budget (top 10 wins)",
    summary: "The most impactful steps that cost little or nothing.",
    minutes: 6,
    topics: ["Budget", "Getting Started"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Free or nearly free wins

1. **Fill water bottles from tap** — Store 9L per person (free)
2. **Write emergency contacts on paper** — Phones die (free)
3. **Locate utility shut-offs** — Know where they are (free)
4. **Download offline maps** — Google Maps allows offline areas (free)
5. **Create a family meeting point** — Agree on two spots (free)

## Low-cost high-impact

6. **Flashlight + batteries** — Basic model works (~€5)
7. **Candles and matches** — Buy in bulk (~€3)
8. **Manual can opener** — Essential if you have canned food (~€3)
9. **Power bank** — Charge your phone twice (~€15)
10. **First aid basics** — Bandages, antiseptic (~€10)

## The "buy a little extra" method
Each grocery trip, add one extra shelf-stable item. Over weeks, you build supply without noticing.

## Budget checklist
- [ ] Water stored (free)
- [ ] Contacts written (free)
- [ ] Flashlight acquired
- [ ] Power bank charged
- [ ] Pantry buffer started

**Next step:** Use the supplies planner to prioritize what to get next.`
  },
  {
    slug: "storage-small-spaces",
    title: "Small spaces: smart storage tips",
    summary: "Where to store emergency supplies in limited space.",
    minutes: 5,
    topics: ["Storage", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Think vertical and hidden
Small spaces require creative storage. Look for underused areas.

## Storage spots to consider
- Under beds (flat containers)
- Top of closets
- Behind doors (hanging organizers)
- Inside luggage you rarely use
- Under bathroom sink
- In entry closet

## Consolidate and containerize
- Use stackable containers
- Label everything
- Keep grab-bag separate and accessible
- Rotate food storage with pantry

## Multi-use items
- Luggage can store emergency supplies AND serve as grab bag
- Water bottles used daily, rotated naturally
- Blankets serve normal use + emergency

## Small space checklist
- [ ] Under-bed space evaluated
- [ ] Closet tops used
- [ ] Grab bag accessible (not buried)
- [ ] Containers labeled

**Next step:** Create a compact supplies list with the supplies planner.`
  },
  {
    slug: "hygiene-simplified",
    title: "Hygiene without running water (practical)",
    summary: "Stay clean when water is limited or unavailable.",
    minutes: 5,
    topics: ["Hygiene", "Supplies"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## When water is limited
You can stay clean with minimal water if you have the right supplies.

## Essential hygiene supplies
- Wet wipes (body-safe, unscented)
- Hand sanitizer (60%+ alcohol)
- Dry shampoo
- Toothbrush + toothpaste
- Toilet paper + waste bags
- Feminine hygiene products
- Garbage bags (waste management)

## Water-saving tips
- Wet wipe "bath" uses no water
- Prioritize hand hygiene (prevents illness)
- Use sanitizer before eating
- Bucket method for toilet if plumbing fails

## Waste management
- Double-bag waste
- Cat litter absorbs odor in emergency toilet setups
- Store waste away from living area
- Know local guidance for extended outages

## Hygiene checklist
- [ ] Wet wipes stocked
- [ ] Hand sanitizer available
- [ ] Waste bags ready
- [ ] Hygiene kit separate and accessible

**Next step:** Add hygiene supplies to your planner checklist.`
  },
  {
    slug: "cooking-without-power",
    title: "Cooking when power is limited",
    summary: "Simple ways to prepare food without electricity.",
    minutes: 6,
    topics: ["Food", "Power"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## No-cook is the easiest option
Stock foods that don't need cooking: canned goods, crackers, nut butter, dried fruit.

## If you want to cook

### Safe indoor options
- Camping stove (with ventilation)
- Fondue burner (small, controlled)
- Chafing dish with fuel

### Outdoor only
- BBQ grill (never indoors — carbon monoxide risk)
- Camping fire setup

## Safety first
- Never use outdoor grills indoors
- Ensure ventilation for any flame
- Keep fire extinguisher nearby
- Supervise constantly

## Fuel planning
- Store fuel for your cooking method
- Know how many meals per fuel unit
- Keep fuel away from heat/flame

## Cooking checklist
- [ ] No-cook food available
- [ ] Cooking method chosen (if needed)
- [ ] Fuel stored safely
- [ ] Ventilation plan confirmed

**Next step:** Check the supplies planner for cooking equipment.`
  },
  {
    slug: "offline-first",
    title: "Offline-first: how to keep your plan usable",
    summary: "Make sure your emergency plan works without internet.",
    minutes: 5,
    topics: ["Digital", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Why offline matters
In emergencies, internet and cell networks often fail first. Your plan must work without them.

## Print the essentials
- Emergency contacts
- Family meeting points
- Medical info
- Key phone numbers (doctor, insurance, family)
- Local emergency numbers

## Download for offline use
- Maps (Google Maps offline areas)
- Key documents (insurance, ID copies)
- This app works offline for core content

## Paper backup locations
- In your grab bag
- At home in a known spot
- Copy with out-of-area contact
- At work (optional)

## Offline checklist
- [ ] Emergency plan printed
- [ ] Offline maps downloaded
- [ ] Paper copies in 2 locations
- [ ] Battery radio or offline news source

**Next step:** Get your Personalized Resiliency Plan in printable format.`
  },
  {
    slug: "routines",
    title: "Weekly 10-minute routine to stay prepared",
    summary: "A simple rhythm that keeps your plan current without stress.",
    minutes: 4,
    topics: ["Planning", "Habits"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Why routine beats one-time effort
Preparedness isn't a project — it's a habit. Small, regular checks beat annual overhauls.

## The 10-minute weekly check
Pick a day (Sunday evening works well):
1. Charge power banks and flashlight batteries
2. Check water supply (rotate if needed)
3. Quick fridge/freezer inventory
4. Confirm grab bag is accessible
5. Glance at weather/news for the week ahead

## Monthly additions
- Check medication supply
- Test smoke/CO detectors
- Review emergency contacts (any changes?)
- Rotate one pantry item

## Quarterly deep check
- Full supplies inventory
- Update documents if needed
- Practice family meeting points
- Refresh kids on the plan

## Routine checklist
- [ ] Weekly check day chosen
- [ ] Reminder set
- [ ] First 10-minute check completed
- [ ] Monthly and quarterly reminders set

**Next step:** Download a printable checklist for your routine.`
  },
  {
    slug: "what-to-buy-first",
    title: "Hard-to-get items: what to buy first",
    summary: "Some supplies sell out fast in emergencies. Get these early.",
    minutes: 5,
    topics: ["Supplies", "Planning"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## Why timing matters
In an emergency, everyone shops at once. Some items disappear within hours.

## Buy now, not later

### Water-related
- Water purification tablets
- Portable water filter
- Large water containers

### Power-related
- Power banks (high capacity)
- Solar chargers
- Batteries (common sizes)
- Hand-crank radio

### Safety and communication
- Battery-powered radio
- Flashlights (quality ones)
- First aid supplies

### Food
- Camp stove + fuel
- Manual can opener
- Shelf-stable protein (canned fish, beans)

## What sells out first
Based on past events: water, batteries, flashlights, bread, fuel, generators.

## Priority checklist
- [ ] Water storage/purification covered
- [ ] Power backup ready
- [ ] Radio for information
- [ ] No-cook food available

**Next step:** Check recommended products for quality options.`
  },
  {
    slug: "printable-plan",
    title: "Why a printable plan helps (and what's inside)",
    summary: "The value of having everything in one offline-ready document.",
    minutes: 4,
    topics: ["Planning", "Documents"],
    audience: ["Everyone"],
    offlineReady: true,
    contentMarkdown: `## The problem with scattered info
Apps, notes, websites — it's everywhere. In an emergency, you need ONE place to look.

## What a good plan includes
- Emergency contacts (family, neighbors, doctors)
- Meeting points and routes
- Medical info and medications
- Key documents summary
- Supplies checklist
- Household-specific notes

## Why printable matters
- Works without power or internet
- Can be shared with family members
- Quick reference in stress
- Stored in multiple locations

## The "Red Folder" format
We designed the Red Folder to be:
- Compact (fits in a grab bag)
- Scannable (find info fast)
- Personalized (your household's data)
- Printable (offline-first)

## Plan checklist
- [ ] All emergency contacts in one place
- [ ] Plan accessible offline
- [ ] Family members have copies
- [ ] Stored in grab bag

**Next step:** Get your Personalized Resiliency Plan (includes Red Folder PDF).`
  }
];

export const allTopics = [...new Set(tipsContent.flatMap(t => t.topics))].sort();
export const allAudiences = [...new Set(tipsContent.flatMap(t => t.audience))].sort();
