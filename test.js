require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/auth/zoom', (req, res) => {
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.ZOOM_CLIENT_ID}&redirect_uri=${process.env.ZOOM_REDIRECT_URI}`;
  res.redirect(authUrl);
});

app.get('/auth/zoom/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.ZOOM_REDIRECT_URI,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);
    console.log('Expires In:', expires_in);

    res.send(
      `<h1>token saved successfully।</h1><p>Access Token: ${access_token}</p>`,
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('OAuth error');
  }
});

app.post('/auth/zoom/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  try {
    const refreshResponse = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    res.json(refreshResponse.data);
  } catch (error) {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

app.post('/create-meeting', async (req, res) => {
  const { access_token, topic, start_time, duration } = req.body;

  try {
    const meetingResponse = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: topic || 'new meeting',
        type: 2,
        start_time:
          start_time || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        duration: duration || 60,
        timezone: 'Asia/Dhaka',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const meetingData = meetingResponse.data;
    res.json({
      success: true,
      join_url: meetingData.join_url,
      start_url: meetingData.start_url,
      id: meetingData.id,
    });
  } catch (error) {
    console.error(error.response?.data);
    res.status(500).json({ error: 'meeting created successfully' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
