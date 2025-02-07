import express from 'express';
import { createHmac } from 'crypto';

const router = express.Router();

router.post('/sign', async (req, res) => {
  try {
    const { queryString, apiSecret } = req.body;

    if (!queryString || !apiSecret) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: 'Both queryString and apiSecret are required'
      });
    }

    // Create HMAC SHA256 signature
    const signature = createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');

    res.json({ signature });
  } catch (error) {
    console.error('Error signing request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;