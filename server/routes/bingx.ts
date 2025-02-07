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

    console.log('Received query string for signing:', queryString);

    // BingX requires HMAC SHA256 signature of the query string
    const signature = createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex')
      .toLowerCase(); // BingX expects lowercase signature

    console.log('Generated signature:', signature);

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