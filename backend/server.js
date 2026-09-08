require('dotenv').config();

const path = require('node:path');
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'grand_palate',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

app.get('/api/health', async (request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/assistant', async (request, response) => {
  try {
    const message = requiredText(request.body.message, 'Message');
    const history = Array.isArray(request.body.history) ? request.body.history.slice(-6) : [];

    if (!process.env.OPENAI_API_KEY) {
      const normalizedMessage = message.toLowerCase();
      let reply = 'I can help with reservations, dining, the lounge, and private events. What would you like to know?';
      if (normalizedMessage.includes('reserve') || normalizedMessage.includes('book')) {
        reply = 'You can book a table from the Reservations page. Choose your date, time, and guest count, then our team will confirm availability.';
      } else if (normalizedMessage.includes('hour') || normalizedMessage.includes('open')) {
        reply = 'We are open Mon-Thu from 12pm to 11pm, Fri-Sat from 12pm to 1am, and Sunday from 11am to 11pm.';
      } else if (normalizedMessage.includes('party') || normalizedMessage.includes('event')) {
        reply = 'Our party hall supports celebrations, presentations, plated menus, and premium bar service. Visit the Party Hall page to enquire.';
      } else if (normalizedMessage.includes('menu') || normalizedMessage.includes('food')) {
        reply = 'Our menu brings together Indian, continental, and crafted beverage selections. Visit the Menu page to explore the current offering.';
      }
      return response.json({ reply, mode: 'fallback' });
    }

    const aiResponse = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 250,
        messages: [
          {
            role: 'system',
            content: 'You are the concierge for The Grand Palate hotel and restaurant. Be concise, warm, and helpful. Only discuss reservations, menu, opening hours, lounge, party hall, and contact details. Never invent prices or availability; direct guests to the reservation form when booking is needed.'
          },
          ...history.filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string'),
          { role: 'user', content: message }
        ]
      })
    });

    if (!aiResponse.ok) throw new Error(`AI provider returned ${aiResponse.status}`);
    const result = await aiResponse.json();
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('AI provider returned an empty response');
    return response.json({ reply, mode: 'ai' });
  } catch (error) {
    console.error('Assistant error:', error.message);
    return response.status(500).json({ error: 'The assistant is temporarily unavailable. Please use our contact form.' });
  }
});

app.post('/api/reservations', async (request, response) => {
  try {
    const name = requiredText(request.body.name, 'Name');
    const email = requiredText(request.body.email, 'Email');
    const phone = requiredText(request.body.phone, 'Phone');
    const date = requiredText(request.body.date, 'Date');
    const time = requiredText(request.body.time, 'Time');
    const guests = requiredText(request.body.guests, 'Guests');
    const notes = typeof request.body.notes === 'string' ? request.body.notes.trim() : '';

    if (!validEmail(email)) {
      return response.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO reservations
       (name, email, phone, reservation_date, reservation_time, guests, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, date, time, guests, notes]
    );

    return response.status(201).json({
      id: result.insertId,
      message: 'Reservation request received.'
    });
  } catch (error) {
    console.error('Reservation error:', error.message);
    return response.status(400).json({ error: error.message });
  }
});

app.post('/api/messages', async (request, response) => {
  try {
    const name = requiredText(request.body.name, 'Name');
    const email = requiredText(request.body.email, 'Email');
    const subject = requiredText(request.body.subject, 'Subject');
    const message = requiredText(request.body.message, 'Message');

    if (!validEmail(email)) {
      return response.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name, email, subject, message]
    );

    return response.status(201).json({
      id: result.insertId,
      message: 'Message sent successfully.'
    });
  } catch (error) {
    console.error('Message error:', error.message);
    return response.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`The Grand Palate server is running at http://localhost:${port}`);
});
