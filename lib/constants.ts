export const CATEGORIES: { label: string; color: string }[] = [
    { label: "Food & Dining", color: "bg-yellow-500" },
    { label: "Groceries", color: "bg-lime-500" },
    { label: "Shopping", color: "bg-pink-500" },
    { label: "Transport", color: "bg-orange-500" },
    { label: "Fuel & Auto", color: "bg-amber-600" },
    { label: "Travel", color: "bg-sky-500" },
    { label: "Health & Medical", color: "bg-teal-500" },
    { label: "Bills & Utilities", color: "bg-gray-500" },
    { label: "Entertainment", color: "bg-purple-500" },
    { label: "Education", color: "bg-blue-500" },
    { label: "UPI Transfer", color: "bg-cyan-500" },
    { label: "Income", color: "bg-emerald-500" },
    { label: "Investment", color: "bg-indigo-500" },
    { label: "Subscriptions", color: "bg-violet-500" },
    { label: "Rent & Housing", color: "bg-rose-600" },
    { label: "Other", color: "bg-slate-500" },
];

// Flat list used in AI prompts — must stay in sync with labels above
export const CATEGORY_LABELS = CATEGORIES.map(c => c.label);
