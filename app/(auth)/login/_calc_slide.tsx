// SCRATCH — copy this JSX into login/page.tsx replacing lines 597-771

const S = `bg-[#0d121c] border border-white/5 rounded-lg px-3 py-2.5 gap-2 flex items-center focus-within:border-emerald-500/50 transition-colors`;
const inp = `flex-1 bg-transparent text-white text-sm font-semibold outline-none w-full`;
const sliderCls = `w-full accent-emerald-500 h-1 bg-white/10 rounded-full appearance-none`;
const lbl = `text-[10px] text-zinc-500 mb-1 block`;
const row = (label:string, val:string) => ({label, val});

// Sidebar menu config
const menu = [
  { id:'us', label:'US Calculators', items:[
    {tab:'mortgage',name:'Mortgage Calculator'},
    {tab:'k401',name:'401(k) Calculator'},
    {tab:'rothira',name:'Roth IRA Calculator'},
    {tab:'salestax',name:'Sales Tax Calculator'},
  ]},
  { id:'loan', label:'Loan & EMI', items:[
    {tab:'emi',name:'EMI Calculator'},
    {tab:'si',name:'Simple Interest'},
    {tab:'loancomp',name:'Loan Comparison'},
  ]},
  { id:'invest', label:'Investment & Savings', items:[
    {tab:'sip',name:'SIP Calculator'},
    {tab:'lumpsum',name:'Lumpsum Calculator'},
    {tab:'compound',name:'Compound Interest'},
    {tab:'fd',name:'FD Calculator'},
    {tab:'ppf',name:'PPF Calculator'},
  ]},
  { id:'plan', label:'Planning & Tax', items:[
    {tab:'budget',name:'Budget Planner'},
    {tab:'daily',name:'Daily Allowance'},
    {tab:'retirement',name:'Retirement Calculator'},
    {tab:'inflation',name:'Inflation Calculator'},
    {tab:'gst',name:'GST Calculator'},
    {tab:'gratuity',name:'Gratuity Calculator'},
    {tab:'salary',name:'Salary Calculator'},
  ]},
];
