// lib/categorize.ts

interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category?: string;
  page?: number;
}

// ─── Your exact budget categories ────────────────────────────────────────────
export const APP_CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Shopping",
  "Transport",
  "Fuel & Auto",
  "Travel",
  "Health & Medical",
  "Bills & Utilities",
  "Entertainment",
  "Education",
  "UPI Transfer",
  "Investment",
  "Subscriptions",
  "Rent & Housing",
  "Income",
  "Other",
] as const;

export type AppCategory = typeof APP_CATEGORIES[number];

// ─── Extract Paytm "Tag: # Something" ────────────────────────────────────────
function extractPaytmTag(desc: string): string | null {
  const match = desc.match(/Tag:\s*#\s*([^\n|on]+)/i);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

// ─── Map Paytm tag to category ────────────────────────────────────────────────
function categoryFromPaytmTag(tag: string): AppCategory | null {
  if (/money\s*transfer|transfer|upi\s*transfer/i.test(tag)) return "UPI Transfer";
  if (/groceries|grocery/i.test(tag)) return "Groceries";
  if (/food|dining|restaurant/i.test(tag)) return "Food & Dining";
  if (/fuel|petrol|auto/i.test(tag)) return "Fuel & Auto";
  if (/transport|cab|ride|travel/i.test(tag)) return "Transport";
  if (/shopping|cloth|fashion/i.test(tag)) return "Shopping";
  if (/bill|utility|recharge|mobile|electricity/i.test(tag)) return "Bills & Utilities";
  if (/health|medical|medicine|pharmacy/i.test(tag)) return "Health & Medical";
  if (/entertainment|movie|ott/i.test(tag)) return "Entertainment";
  if (/education|school|course/i.test(tag)) return "Education";
  if (/investment|mutual|sip|stock/i.test(tag)) return "Investment";
  if (/subscription/i.test(tag)) return "Subscriptions";
  if (/rent|housing/i.test(tag)) return "Rent & Housing";
  if (/salary|income/i.test(tag)) return "Income";
  return null;
}

// ─── Known merchant → category ───────────────────────────────────────────────
const MERCHANT_RULES: { pattern: RegExp; category: AppCategory }[] = [
  // Groceries (separate from Food & Dining)
  {
    pattern: /zepto|zeptonow|blinkit|bigbasket|grofer|dunzo|jiomart|dmart|reliance\s*fresh|more\s*supermarket|nature'?s\s*basket/i,
    category: "Groceries",
  },
  // Food & Dining (restaurants, delivery)
  {
    pattern: /zomato|payzomato|swiggy|eatsure|freshmenu|domino|pizza|burger|kfc|mcdonalds|subway|starbucks|cafe|restaurant|biryani|bakery|dhaba|chicago\s*pizza|srjn\s*hospitality|omgro/i,
    category: "Food & Dining",
  },
  // Shopping
  {
    pattern: /flipkart|amazon|myntra|ajio|meesho|nykaa|snapdeal|shopsy|reliance\s*digital|croma|vijay\s*sales|bigbazaar|sabnam|eternal\s*limited|hyugalife/i,
    category: "Shopping",
  },
  // Fuel & Auto
  {
    pattern: /\bBP\b|petrol|fuel|hp\s*pump|indianoil|bharat\s*petroleum|shell|fastag|toll|parking|gas\s*station/i,
    category: "Fuel & Auto",
  },
  // Transport
  {
    pattern: /uber|ola\s*cab|rapido|redbus|metro|bus\s*pass|auto\s*rickshaw/i,
    category: "Transport",
  },
  // Travel
  {
    pattern: /irctc|railways|flight|indigo|spicejet|airindia|vistara|makemytrip|goibibo|yatra|hotel|oyo|airbnb/i,
    category: "Travel",
  },
  // Entertainment
  {
    pattern: /netflix|spotify|hotstar|primevideo|zee5|sonyliv|jiocinema|gaana|wynk|bookmyshow|pvr|inox|cinepolis|steam|playstation|gaming/i,
    category: "Entertainment",
  },
  // Subscriptions
  {
    pattern: /apple\s*subscription|google\s*one|microsoft\s*365|adobe|notion|slack\s*subscription|linkedin\s*premium/i,
    category: "Subscriptions",
  },
  // Bills & Utilities
  {
    pattern: /recharge|jio\s*mobile|airtel|vi\s*mobile|vodafone|bsnl|electricity|bescom|mseb|tata\s*power|adani\s*power|water\s*bill|gas\s*bill|piped\s*gas|broadband|act\s*fiber|hathway|dth|tatasky|dishtv|sundirect/i,
    category: "Bills & Utilities",
  },
  // Health & Medical
  {
    pattern: /pharmacy|chemist|medical|hospital|clinic|doctor|practo|1mg|netmedi|apollo|fortis|medplus|pharmeasy|healthkart/i,
    category: "Health & Medical",
  },
  // Education
  {
    pattern: /school|college|university|coaching|tuition|udemy|coursera|byju|unacademy|vedantu|book\s*fee|library/i,
    category: "Education",
  },
  // Investment
  {
    pattern: /zerodha|groww|kuvera|mutual\s*fund|\bsip\b|trading|ipo|demat|upstox|angel\s*brok|coin\s*by/i,
    category: "Investment",
  },
  // Rent & Housing
  {
    pattern: /rent|pg\s*rent|hostel|landlord|house\s*rent|room\s*rent|maintenance\s*charge|society\s*charge/i,
    category: "Rent & Housing",
  },
  // Insurance
  {
    pattern: /\blic\b|insurance|policybazaar|acko|hdfc\s*life|icici\s*prudential|bajaj\s*allianz|star\s*health/i,
    category: "Bills & Utilities", // map to Bills since no Insurance category
  },
];

// ─── Detect person-to-person UPI transfer ────────────────────────────────────
function isPersonUPITransfer(desc: string): boolean {
  // Known merchants — never a person transfer
  const merchantKeywords = /zomato|swiggy|zepto|blinkit|flipkart|amazon|netflix|recharge|jio|airtel|payzomato|razorpay|pizza|domino|sabnam|omgro|hyuga|eternal|srjn/i;
  if (merchantKeywords.test(desc)) return false;

  // Personal UPI handle endings
  const personalHandles = [
    "@ybl", "@okaxis", "@okhdfcbank", "@okicici", "@oksbi",
    "@ptaxis", "@ibl", "@axl", "@fbl", "@cnrb", "@sbi",
    "@ubi", "@pnb", "@boi", "@upi", "@apl", "@kotak",
    "@indus", "@hsbc", "@citi", "@rbl", "@dbs",
  ];
  const hasPersonalHandle = personalHandles.some(h =>
    desc.toLowerCase().includes(h.toLowerCase())
  );

  // Phone number based UPI like 9953999394@ibl
  const hasPhoneUPI = /\b\d{10}@[a-z]+/i.test(desc);

  // Must have a person-transfer phrase
  const hasTransferPhrase = /^(paid\s+to|money\s+sent\s+to|received\s+from|sent\s+to|transfer\s+to)\s+[A-Z][a-z]/i.test(desc.trim());

  return hasTransferPhrase && (hasPersonalHandle || hasPhoneUPI);
}

// ─── Main function ────────────────────────────────────────────────────────────
export function categorizeTransaction(tx: RawTransaction): AppCategory {
  const desc = tx.description ?? "";
  const tag = extractPaytmTag(desc);

  // 1. Salary / Income — highest priority
  if (tx.type === "credit" && /salary|payroll|stipend|wage/i.test(desc)) {
    return "Income";
  }

  // 2. Paytm tag says "Money Transfer" — trust it
  if (tag) {
    const tagCat = categoryFromPaytmTag(tag);
    if (tagCat === "UPI Transfer") return "UPI Transfer";
  }

  // 3. Person-to-person UPI transfer
  if (isPersonUPITransfer(desc)) return "UPI Transfer";

  // 4. Received from a person (not cashback/refund)
  if (
    tx.type === "credit" &&
    /^received\s+from\s+[A-Z][a-z]/i.test(desc.trim()) &&
    !/zomato|amazon|flipkart|swiggy|cashback|refund/i.test(desc)
  ) return "UPI Transfer";

  // 5. Merchant keyword rules
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(desc)) return rule.category;
  }

  // 6. Use Paytm tag as fallback for other categories
  if (tag) {
    const tagCat = categoryFromPaytmTag(tag);
    if (tagCat) return tagCat;
  }

  // 7. Cashback/refund
  if (/cashback|refund|reversal/i.test(desc)) return "Income";

  // 8. paytmqr without known merchant = Shopping
  if (/paytmqr/i.test(desc)) return "Shopping";

  return "Other";
}

export function categorizeAll(transactions: RawTransaction[]): RawTransaction[] {
  return transactions.map(tx => ({
    ...tx,
    category: categorizeTransaction(tx),
  }));
}