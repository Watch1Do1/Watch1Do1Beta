
import type { CartItem, Product } from "../types.js";

/**
 * Email Service (Resend Integration)
 * Dispatches 'Project Payloads' and 'Creator Notifications'
 */
export const emailService = {
  async sendProjectConfirmation(email: string, projectTitle: string): Promise<boolean> {
    try {
        const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: email,
                subject: 'Project Hub Active - Watch1Do1',
                html: `<h1>Project Confirmed: ${projectTitle}</h1>` // Minimal for now, can be expanded
            })
        });
        return response.ok;
    } catch (e) {
        console.error("Email Error:", e);
        return false;
    }
  },

  /**
   * Automated Creator Approval Notification
   */
  async sendApprovalEmail(email: string, title: string, products: Product[]): Promise<boolean> {
      console.log("[Resend] Dispatching APPROVAL notification to:", email);
      
      const productList = products.map(p => `
        <li style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #1e293b;">
          <strong style="color: #ffffff;">${p.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">${p.retailer} • $${p.price.amount.toFixed(2)}</span>
        </li>
      `).join('');

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background: #020617; color: #f8fafc; border-radius: 32px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px;">Project Hub Deployed</h1>
                <p style="text-transform: uppercase; font-size: 9px; color: #475569; letter-spacing: 4px; margin-top: 8px; font-weight: 800;">Watch1Do1 Official Status</p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">Great news! Your video <strong>"${title}"</strong> has passed review and is now live in the global catalog.</p>
            
            <div style="background: #0f172a; padding: 25px; border-radius: 20px; margin: 30px 0; border: 1px solid #1e293b;">
                <h2 style="font-size: 11px; text-transform: uppercase; color: #7D8FED; margin-top: 0; letter-spacing: 2px; font-weight: 900;">AI Identified Materials:</h2>
                <ul style="font-size: 13px; color: #94a3b8; line-height: 1.6; padding-left: 0; list-style: none;">
                    ${productList}
                </ul>
                <p style="font-size: 11px; color: #475569; margin-top: 15px; font-style: italic;">Note: Builders can now purchase these items directly from your Hub.</p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
                Notice an issue with the products identified? <br/>
                Reply to this email or contact <a href="mailto:team@watch1do1.com" style="color: #7D8FED; text-decoration: none; font-weight: bold;">team@watch1do1.com</a> to request a manual material re-scan.
            </p>
        </div>
      `;
      
      try {
          const res = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: email, subject: `Project Hub Active: ${title}`, html })
          });
          if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `Transmission failed (${res.status})`);
          }
          return true;
      } catch (e) { 
          console.error("[EmailService] Approval send failed:", e);
          throw e; 
      }
  },

  /**
   * Automated Creator Rejection Notification
   */
  async sendRejectionEmail(email: string, title: string, reason: string, note: string): Promise<boolean> {
      console.log("[Resend] Dispatching REJECTION notification to:", email);
      
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background: #020617; color: #f8fafc; border-radius: 32px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f43f5e; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px;">Deployment Flagged</h1>
                <p style="text-transform: uppercase; font-size: 9px; color: #475569; letter-spacing: 4px; margin-top: 8px; font-weight: 800;">Refinement Required</p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">Your submission <strong>"${title}"</strong> requires further refinement before it can be deployed to the catalog.</p>
            
            <div style="background: #0f172a; padding: 25px; border-radius: 20px; margin: 30px 0; border: 2px solid #f43f5e20;">
                <h2 style="font-size: 11px; text-transform: uppercase; color: #f43f5e; margin-top: 0; letter-spacing: 2px; font-weight: 900;">Flag Reason:</h2>
                <p style="font-size: 16px; font-weight: 900; color: #ffffff; margin: 8px 0;">${reason}</p>
                <div style="height: 1px; background: #1e293b; margin: 15px 0;"></div>
                <h2 style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 0; letter-spacing: 2px; font-weight: 900;">Admin Feedback:</h2>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">${note}</p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center;">
                You can edit your build and re-submit for review anytime from your <strong style="color: #7D8FED;">Maker Profile</strong>.
            </p>
        </div>
      `;
      
      try {
          const res = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: email, subject: `Project Revision Required: ${title}`, html })
          });
          if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `Transmission failed (${res.status})`);
          }
          return true;
      } catch (e) { 
          console.error("[EmailService] Rejection send failed:", e);
          throw e; 
      }
  },

  /**
   * Dispatches a secure recovery link to a maker.
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
      console.log("[Resend] Dispatching RECOVERY payload to:", email);
      
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background: #020617; color: #f8fafc; border-radius: 32px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7D8FED; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px;">Security Recovery</h1>
                <p style="text-transform: uppercase; font-size: 9px; color: #475569; letter-spacing: 4px; margin-top: 8px; font-weight: 800;">Watch1Do1 Auth Protocol</p>
            </div>
 
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">A security recovery request was initialized for your Maker Profile. Click the button below to synchronize a new access key.</p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${resetLink}" style="background: #7D8FED; color: white; padding: 18px 32px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(125, 143, 237, 0.2);">Reset Access Key</a>
            </div>
 
            <div style="background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; margin-top: 20px;">
                <p style="font-size: 11px; color: #475569; margin: 0; text-align: center;">
                    This link will expire in 1 hour. If you did not initialize this transmission, please ignore this email.
                </p>
            </div>
        </div>
      `;
      
      try {
          const res = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: email, subject: 'Maker Hub Recovery Link', html })
          });
          if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `Transmission failed (${res.status})`);
          }
          return true;
      } catch (e) { 
          console.error("[EmailService] Password reset send failed:", e);
          throw e; 
      }
  },

  /**
   * Formats the shopping cart into a mobile-first HTML checklist for Resend.
   */
  async sendEmailKit(email: string, title: string, items: CartItem[]): Promise<boolean> {
      console.log("[Resend] Generating build kit payload for:", email);
      
      // Calculate subtotal using Money.amount property
      const subtotal = items.reduce((acc, item) => {
        return acc + (item.price.amount * item.quantity);
      }, 0);

      const itemsHtml = items.map(i => `
        <div style="padding: 15px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; background: #0f172a;">
            <img src="${i.imageUrl}" width="60" height="60" style="border-radius: 12px; margin-right: 15px; object-fit: cover; border: 1px solid #334155;" />
            <div style="flex-grow: 1;">
                <div style="color: #ffffff; font-weight: 800; font-size: 14px; margin-bottom: 2px; font-family: sans-serif;">${i.name}</div>
                <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif;">${i.retailer} • Qty: ${i.quantity}</div>
            </div>
            <div style="color: #7D8FED; font-weight: 900; font-size: 14px; font-family: sans-serif;">$${i.price.amount.toFixed(2)}</div>
        </div>
      `).join('');

      const htmlTemplate = `
        <div style="background-color: #020617; color: #f8fafc; font-family: sans-serif; padding: 40px 20px; max-width: 600px; margin: auto; border-radius: 32px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #7D8FED; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -1.5px;">Watch1Do1</h1>
                <p style="text-transform: uppercase; font-size: 9px; color: #475569; letter-spacing: 4px; margin-top: 8px; font-weight: 800;">Digital Build Payload</p>
            </div>

            <div style="background: #0f172a; padding: 30px; border-radius: 24px; margin-bottom: 30px; border: 1px solid #1e293b; text-align: center;">
                <p style="text-transform: uppercase; font-size: 9px; color: #7D8FED; font-weight: 900; margin-bottom: 10px;">Project Hub Active</p>
                <h2 style="font-size: 20px; font-weight: 900; margin: 0; color: #ffffff;">${title}</h2>
            </div>

            <div style="border-radius: 20px; overflow: hidden; border: 1px solid #1e293b;">
                ${itemsHtml}
            </div>

            <div style="text-align: right; padding: 30px 10px 0 10px;">
                <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Estimated Acquisition Cost</span>
                <div style="color: #ffffff; font-size: 36px; font-weight: 900; letter-spacing: -1px;">$${subtotal.toFixed(2)}</div>
            </div>

            <div style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #1e293b;">
                <p style="font-size: 10px; color: #334155; line-height: 1.8; font-weight: 600;">
                    This checklist was synchronized via Watch1Do1 AI Vision Protocols. <br/>
                    Build responsibly. Verify all specifications before ignition.
                </p>
            </div>
        </div>
      `;
      
      try {
          const res = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: email, subject: `Maker Payload Secured: ${title}`, html: htmlTemplate })
          });
          if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `Transmission failed (${res.status})`);
          }
          return true;
      } catch (e) { 
          console.error("[EmailService] Send failed:", e);
          throw e; 
      }
  }
};
