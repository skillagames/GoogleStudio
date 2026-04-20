import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // PayFast Signature Generation API
  app.post('/api/payments/payfast-signature', (req, res) => {
    try {
      const { 
        amount, 
        item_name, 
        m_payment_id,
        return_url,
        cancel_url,
        notify_url 
      } = req.body;

      const mId = process.env.PAYFAST_MERCHANT_ID || '10047985';
      const mKey = process.env.PAYFAST_MERCHANT_KEY || 'e6sqcsvu1b9az';
      const passphrase = process.env.PAYFAST_PASSPHRASE || '';

      // PAYFAST STRICT ORDER
      const data: Record<string, string> = {
        merchant_id: mId.trim(),
        merchant_key: mKey.trim(),
        return_url: return_url.trim(),
        cancel_url: cancel_url.trim(),
        notify_url: notify_url.trim(),
        m_payment_id: m_payment_id.trim(),
        amount: amount.trim(),
        item_name: item_name.trim(),
      };

      // Construct parameter string in the REQUIRED sequence
      const orderedKeys = [
        'merchant_id',
        'merchant_key',
        'return_url',
        'cancel_url',
        'notify_url',
        'm_payment_id',
        'amount',
        'item_name'
      ];

      let pfOutput = "";
      orderedKeys.forEach(key => {
        if (data[key] !== undefined && data[key] !== "") {
          pfOutput += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}&`;
        }
      });

      // Remove last ampersand
      let getString = pfOutput.slice(0, -1);
      
      // Append passphrase ONLY if it is set in environment
      if (passphrase && passphrase.trim() !== "") {
        getString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
      }

      const signature = crypto.createHash('md5').update(getString).digest('hex');

      res.json({ 
        signature,
        merchant_id: mId,
        merchant_key: mKey,
        sandbox_url: process.env.PAYFAST_SANDBOX_URL || 'https://sandbox.payfast.co.za/eng/process'
      });
    } catch (error) {
      console.error('PayFast Signature Error:', error);
      res.status(500).json({ error: 'Failed to generate signature' });
    }
  });

  // PayFast Callback Route
  // This route is called when PayFast redirects back after payment
  // It sends a message to the opener (the app in the iframe) and closes itself
  app.get('/api/payments/payfast-callback', (req, res) => {
    const { status } = req.query;
    res.send(`
      <html>
        <head><title>Processing Payment...</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-center; height: 100vh; background: #f4f7fa;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'PAYFAST_PAYMENT_RESULT', 
                status: '${status}' 
              }, '*');
              window.close();
            } else {
              // Fallback if opener is lost
              window.location.href = '/?payment=${status}';
            }
          </script>
          <div style="text-align: center;">
            <h2 style="margin: 0; color: #0f172a;">Syncing Transaction</h2>
            <p style="color: #64748b; font-size: 14px;">Please wait while we finalize your connectivity payload...</p>
          </div>
        </body>
      </html>
    `);
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
