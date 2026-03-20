import nodemailer from 'nodemailer';

// Configure the nodemailer transport using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Generic function to send an email using Gmail SMTP
 */
export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"FinanceNeo" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

/**
 * Template: Large Transaction Alert
 */
export function buildLargeTransactionHTML(amount: number, merchant: string, date: Date | string) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #10b981; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">FinanceNeo</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Security Alert</p>
      </div>
      
      <div style="background-color: #0f172a; padding: 25px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px;">Large Transaction Detected</h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">We noticed a transaction that exceeds your configured alert threshold.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 15px;">Merchant</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f8fafc; font-size: 16px; font-weight: 600; text-align: right;">${merchant}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 15px;">Amount</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #ef4444; font-size: 18px; font-weight: 700; text-align: right;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #94a3b8; font-size: 15px;">Date & Time</td>
            <td style="padding: 12px 0; color: #f8fafc; font-size: 15px; text-align: right;">${formattedDate}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 30px;">
        If you did not authorize this transaction, please review your account immediately.<br><br>
        You are receiving this because you enabled Large Transaction Alerts in FinanceNeo.
      </p>
    </div>
  `;
}

/**
 * Template: Unusual Spending Prediction Alert
 */
export function buildUnusualSpendingHTML(predictedMonthly: number, budgetLimit: number, thresholdPercent: number, reasoning: string) {
  const formattedPredicted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(predictedMonthly);

  const formattedBudget = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(budgetLimit);

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #10b981; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">FinanceNeo</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">AI Spending Alert</p>
      </div>
      
      <div style="background-color: #0f172a; padding: 25px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #eab308; margin-top: 0; font-size: 20px;">Unusual Spending Trajectory Detected</h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">Our AI has detected that your recent spending patterns will cause you to exceed ${thresholdPercent}% of your monthly budget.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
             <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 15px;">Monthly Budget Limit</td>
             <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f8fafc; font-size: 16px; font-weight: 600; text-align: right;">${formattedBudget}</td>
          </tr>
          <tr>
             <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 15px;">AI Predicted Total</td>
             <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #eab308; font-size: 18px; font-weight: 700; text-align: right;">${formattedPredicted}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; background-color: #1e293b; padding: 15px; border-radius: 8px; border-left: 4px solid #eab308;">
           <h3 style="margin-top: 0; color: #f8fafc; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">AI Analysis</h3>
           <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 0;">"${reasoning}"</p>
        </div>
      </div>
      
      <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 30px;">
        You are receiving this because you enabled AI Unusual Spending Alerts in FinanceNeo.
      </p>
    </div>
  `;
}

/**
 * Template: Weekly Summary
 */
export function buildWeeklySummaryHTML(totalSpent: number, budgetLimit: number | null, name: string = "User") {
  const formattedSpent = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(totalSpent);

  let budgetSection = '';

  if (budgetLimit !== null && budgetLimit > 0) {
    const formattedLimit = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(budgetLimit);

    const remaining = budgetLimit - totalSpent;
    const isOverBudget = remaining < 0;

    const formattedRemaining = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.abs(remaining));

    const statusColor = isOverBudget ? '#ef4444' : '#10b981';
    const statusText = isOverBudget ? `Over budget by ${formattedRemaining}` : `${formattedRemaining} remaining`;

    budgetSection = `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 15px;">Weekly Budget Limit</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f8fafc; font-size: 16px; font-weight: 600; text-align: right;">${formattedLimit}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; color: #94a3b8; font-size: 15px;">Status</td>
        <td style="padding: 12px 0; color: ${statusColor}; font-size: 16px; font-weight: 700; text-align: right;">${statusText}</td>
      </tr>
    `;
  }

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #10b981; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">FinanceNeo</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Weekly Summary</p>
      </div>
      
      <div style="background-color: #0f172a; padding: 25px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px;">Hello ${name},</h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">Here is your spending summary for the past 7 days.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 15px;">Total Spent</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f8fafc; font-size: 22px; font-weight: 700; text-align: right;">${formattedSpent}</td>
          </tr>
          ${budgetSection}
        </table>
      </div>
      
      <div style="margin-top: 20px; text-align: center;">
        <a href="https://financeneo.vercel.app/" style="display: inline-block; background-color: #10b981; color: #020617; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; border: 1px solid #059669;">View Full Dashboard</a>
      </div>
      
      <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 30px;">
        Stay on top of your finances with FinanceNeo.<br><br>
        You are receiving this because you enabled Weekly Summaries.
      </p>
    </div>
  `;
}
