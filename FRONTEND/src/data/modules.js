/**
 * data/modules.js
 * Local content for all learning modules.
 * Quiz answers must match the backend QUIZ_BANK exactly (same moduleId, same correct indices).
 */

export const MODULES = [
  {
    id:          'nps_basics',
    title:       'NPS Basics',
    tagline:     'Understand the National Pension System from the ground up',
    icon:        '🏛️',
    accent:      '#f5c542',   // gold
    accentDim:   '#b8922e',
    difficulty:  'Beginner',
    duration:    '8 min',
    xp:          100,
    sections: [
      {
        heading: 'What is NPS?',
        body: `The National Pension System (NPS) is a voluntary, long-term retirement savings scheme designed to enable systematic savings during your working life. Regulated by the Pension Fund Regulatory and Development Authority (PFRDA), NPS is one of the most tax-efficient retirement instruments available in India.

Launched in 2004 for government employees and opened to all Indian citizens in 2009, NPS operates on a defined-contribution basis — meaning your retirement corpus depends on how much you invest and how well those investments perform.`,
      },
      {
        heading: 'Tier I vs Tier II',
        body: `NPS has two types of accounts:

**Tier I** is the primary pension account with restricted withdrawals. Contributions qualify for tax deductions under sections 80CCD(1) and 80CCD(1B). You can withdraw fully only at age 60, with at least 40% used to purchase an annuity.

**Tier II** is a voluntary savings account with no withdrawal restrictions. However, it generally does not offer tax benefits (except for central government employees).`,
      },
      {
        heading: 'How your money is invested',
        body: `Your NPS corpus is managed by PFRDA-registered Pension Fund Managers (PFMs) across three asset classes:

• **Asset Class E (Equity):** Up to 75% allocation — highest risk, highest potential return
• **Asset Class C (Corporate Bonds):** Medium risk, stable returns  
• **Asset Class G (Government Securities):** Lowest risk, government-backed

You can choose **Active Choice** (set your own allocation) or **Auto Choice** (lifecycle-based allocation that reduces equity as you age).`,
      },
      {
        heading: 'PRAN — Your NPS Identity',
        body: `PRAN stands for Permanent Retirement Account Number. It's a unique 12-digit number assigned to every NPS subscriber — it stays with you for life, regardless of job changes or city moves.

Think of PRAN as your pension passport. It ensures portability across employers and locations, and all your NPS transactions are linked to it.`,
      },
      {
        heading: 'Withdrawal at Retirement',
        body: `At age 60, you can withdraw up to 60% of your corpus as a lump sum — this portion is completely tax-free. The remaining 40% (minimum) must be used to purchase an annuity, which provides you a regular monthly income.

You can also choose to defer withdrawals up to age 70 if you want to keep growing your corpus.`,
      },
    ],
    quiz: [
      {
        question: 'What does NPS stand for?',
        options:  ['National Pension System', 'National Payment Scheme', 'New Provident Savings', 'National Protection Scheme'],
        correct:  0,
      },
      {
        question: 'At what age can you normally withdraw your full NPS corpus?',
        options:  ['55', '58', '60', '65'],
        correct:  2,
      },
      {
        question: 'Which regulator oversees NPS in India?',
        options:  ['SEBI', 'RBI', 'IRDAI', 'PFRDA'],
        correct:  3,
      },
      {
        question: 'What is the minimum % of NPS corpus that must be used to buy an annuity at retirement?',
        options:  ['20%', '30%', '40%', '50%'],
        correct:  2,
      },
      {
        question: 'Which NPS account allows partial withdrawals?',
        options:  ['Tier I', 'Tier II', 'Both', 'Neither'],
        correct:  0,
      },
    ],
  },

  {
    id:          'tax_benefits',
    title:       'Tax Benefits',
    tagline:     'Maximise your tax savings with NPS deductions',
    icon:        '💰',
    accent:      '#6ee7b7',   // sage
    accentDim:   '#34a06a',
    difficulty:  'Intermediate',
    duration:    '10 min',
    xp:          150,
    sections: [
      {
        heading: 'The Three-Layer Tax Benefit',
        body: `NPS offers one of the most generous tax deduction structures in India. Most people know about Section 80C, but NPS goes two layers deeper:

**Layer 1 — Section 80CCD(1):** NPS contribution up to 10% of your salary (or 20% for self-employed) counts within the ₹1.5 lakh 80C bucket.

**Layer 2 — Section 80CCD(1B):** An exclusive additional deduction of up to ₹50,000 over and above the 80C limit. This is purely for NPS — no other instrument qualifies.

**Layer 3 — Section 80CCD(2):** Your employer's NPS contribution (up to 10% of salary) is tax-deductible for you, with no upper cap.`,
      },
      {
        heading: 'The Magic Number: ₹2 Lakhs',
        body: `Combine 80CCD(1) (₹1.5L cap shared with 80C) and 80CCD(1B) (exclusive ₹50K), and you can potentially deduct up to ₹2 lakh per year from taxable income — just from NPS.

For someone in the 30% tax bracket, that's a tax saving of up to ₹62,400 per year (including cess). Spread over a 30-year career, this compounding tax advantage is worth crores.`,
      },
      {
        heading: 'Tax-Free Lump Sum at Retirement',
        body: `When you reach 60, up to 60% of your corpus can be withdrawn as a lump sum — and this withdrawal is completely exempt from income tax.

Example: If your NPS corpus at 60 is ₹1 crore, you can take ₹60 lakhs tax-free. The remaining ₹40 lakhs goes into an annuity.

This EEE (Exempt-Exempt-Exempt) treatment makes NPS one of the most tax-efficient long-term wealth-building tools in India.`,
      },
      {
        heading: 'Old vs New Tax Regime',
        body: `Section 80CCD(1B) — the exclusive ₹50K deduction — is only available under the Old Tax Regime.

Under the New Tax Regime (with lower slab rates), most deductions including 80C are not available. However, Section 80CCD(2) (employer's contribution) is still available under the new regime, making it the one NPS benefit that survives regime changes.

If your employer contributes to NPS, ensure this is structured for maximum benefit regardless of which regime you choose.`,
      },
    ],
    quiz: [
      {
        question: 'Under which section is the NPS deduction covered along with 80C?',
        options:  ['80C', '80CCD(1)', '80CCD(2)', '80D'],
        correct:  1,
      },
      {
        question: 'What is the additional exclusive NPS deduction available over and above 80C?',
        options:  ['₹25,000 under 80CCD(1B)', '₹50,000 under 80CCD(1B)', '₹75,000 under 80CCC', '₹1L under 80CCD(2)'],
        correct:  1,
      },
      {
        question: "Is the employer's NPS contribution taxable for the employee?",
        options:  ['Yes, fully taxable', 'No, exempt under 80CCD(2) up to 10% of salary', 'Yes, but only above ₹1L', 'No, fully exempt without limit'],
        correct:  1,
      },
      {
        question: 'What % of NPS corpus can be withdrawn tax-free as a lump sum at retirement?',
        options:  ['25%', '40%', '60%', '100%'],
        correct:  2,
      },
      {
        question: 'Is Tier II NPS eligible for tax deduction?',
        options:  ['Yes, always', 'No, generally not', 'Only for government employees with a lock-in', 'Only for private sector'],
        correct:  2,
      },
    ],
  },

  {
    id:          'investment_basics',
    title:       'Investment Basics',
    tagline:     'Compound interest, asset allocation, and long-term thinking',
    icon:        '📈',
    accent:      '#7dd3fc',   // frost / sky blue
    accentDim:   '#2d8ab5',
    difficulty:  'Beginner',
    duration:    '12 min',
    xp:          120,
    sections: [
      {
        heading: 'The 8th Wonder of the World',
        body: `Compound interest is often called the 8th wonder of the world. Albert Einstein (allegedly) said: "He who understands it, earns it. He who doesn't, pays it."

The formula is simple: FV = P × (1 + r)^n — where P is principal, r is rate, and n is time. The magic is in the exponent. At 10% annual return, ₹1 lakh becomes ₹1.74 lakh in 6 years, ₹6.7 lakh in 20 years, and ₹17.4 lakh in 30 years.

Starting 10 years earlier can double your retirement corpus. Starting at 25 instead of 35 is worth more than any raise you'll get.`,
      },
      {
        heading: 'Real Returns: Beating Inflation',
        body: `Nominal return is what you see on your statement. Real return is what you can actually buy with it.

**Real Return ≈ Nominal Return − Inflation Rate**

If NPS returns 10% and inflation is 6%, your real return is approximately 4%. This is why keeping money in a savings account (3-4% interest) with 6% inflation means you're losing purchasing power every year.

NPS equity funds have historically delivered 10-13% nominal returns, making them one of the best inflation-beating instruments for long-term investors.`,
      },
      {
        heading: 'Asset Allocation: The Only Free Lunch',
        body: `Diversification is the only free lunch in investing — you reduce risk without necessarily reducing returns.

NPS offers three asset classes:
• **Equity (E):** High risk, high return — ideal for young investors with 20+ year horizon
• **Corporate Bonds (C):** Moderate risk — good for stability with some growth
• **Government Securities (G):** Low risk — capital preservation

A common rule: subtract your age from 100 for your equity allocation. At 25, hold 75% equity. At 50, hold 50%. NPS's Auto Choice does this automatically.`,
      },
      {
        heading: 'The Cost of Waiting',
        body: `Two investors: Arjun starts at 25, invests ₹2000/month until 60. Priya starts at 35, invests ₹4000/month until 60.

Same total investment amount. Same 10% return. Yet:
• Arjun ends up with ≈ ₹1.3 crore  
• Priya ends up with ≈ ₹85 lakh

Arjun wins by ₹45 lakh — with half the monthly outflow — purely because of time. This is why "I'll start investing when I earn more" is the most expensive mistake a young Indian can make.`,
      },
    ],
    quiz: [
      {
        question: 'What is compound interest?',
        options:  ['Interest on principal only', 'Interest on principal and accumulated interest', 'Fixed interest regardless of time', 'Interest paid annually only'],
        correct:  1,
      },
      {
        question: 'Which NPS fund option gives the highest equity exposure?',
        options:  ['Conservative Life Cycle Fund', 'Balanced Life Cycle Fund', 'Aggressive Life Cycle Fund', 'Fixed Return Fund'],
        correct:  2,
      },
      {
        question: 'What does diversification primarily help reduce?',
        options:  ['Returns', 'Inflation', 'Risk', 'Tax'],
        correct:  2,
      },
      {
        question: 'If inflation is 6% and your return is 10%, what is the approximate real return?',
        options:  ['16%', '4%', '6%', '10%'],
        correct:  1,
      },
      {
        question: 'Which is generally the highest-risk NPS asset class?',
        options:  ['Government Securities (G)', 'Corporate Bonds (C)', 'Equities (E)', 'Alternative Investments (A)'],
        correct:  2,
      },
    ],
  },

  {
    id:          'withdrawal_rules',
    title:       'Withdrawal Rules',
    tagline:     'Know exactly when and how you can access your NPS money',
    icon:        '🔓',
    accent:      '#fb923c',   // ember / orange
    accentDim:   '#c2611a',
    difficulty:  'Intermediate',
    duration:    '7 min',
    xp:          130,
    sections: [
      {
        heading: 'Normal Exit at 60',
        body: `The standard NPS exit happens at age 60. At this point:
• You can withdraw up to **60% as a lump sum** (completely tax-free)
• At least **40% must be used to purchase an annuity** — the annuity income will be taxed as regular income

If your total corpus is less than ₹5 lakhs, you can withdraw the entire amount as a lump sum.

You can also defer your withdrawal up to age 70, continuing to invest and grow your corpus during this period.`,
      },
      {
        heading: 'Partial Withdrawal (Tier I)',
        body: `Even before 60, NPS Tier I allows **partial withdrawals** under specific conditions:

• You must have been subscribed for at least **3 years**
• You can withdraw a **maximum of 25%** of your own contributions (not employer's)
• Permitted reasons: higher education for children, purchase or construction of house, treatment of critical illness, disability

You can make partial withdrawals up to **3 times** in your entire NPS tenure.`,
      },
      {
        heading: 'Premature Exit (Before 60)',
        body: `If you exit NPS before age 60 (and after 3 years of contribution):
• Only **20% can be withdrawn** as lump sum
• The remaining **80% must be used for an annuity** purchase

This is much more restrictive than the normal exit, which is why NPS is designed for long-term holding.

If you've contributed for less than 3 years and wish to exit, the entire corpus must go into an annuity.`,
      },
      {
        heading: 'In Case of Death',
        body: `If the subscriber dies before retirement:
• The **entire accumulated corpus** is paid to the nominee(s) or legal heirs
• No annuity purchase requirement applies
• The payment is tax-free in the hands of the nominee

This makes NPS also valuable as a retirement protection tool — your family receives full benefit of everything you've built.`,
      },
    ],
    quiz: [
      {
        question: 'What is the maximum lump sum withdrawal allowed from NPS at age 60?',
        options:  ['40%', '50%', '60%', '100%'],
        correct:  2,
      },
      {
        question: 'For partial withdrawal from Tier I, you must have subscribed for at least:',
        options:  ['1 year', '2 years', '3 years', '5 years'],
        correct:  2,
      },
      {
        question: 'If you exit NPS before age 60, what % must go into an annuity?',
        options:  ['40%', '60%', '75%', '80%'],
        correct:  3,
      },
      {
        question: 'How many times can you make partial withdrawals from NPS Tier I?',
        options:  ['1', '2', '3', '5'],
        correct:  2,
      },
      {
        question: 'If a subscriber dies, who receives the NPS corpus?',
        options:  ['Government', 'PFRDA', 'Nominee / legal heirs', 'It is forfeited'],
        correct:  2,
      },
    ],
  },
];

export const getModuleById = (id) => MODULES.find((m) => m.id === id) ?? null;