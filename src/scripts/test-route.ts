import 'dotenv/config';
import jwt from 'jsonwebtoken';

async function main() {
  const userId = 'ed287dac-526a-4374-b234-fc1ba8b5a30a';
  const roomId = '5502b0f7-3fb3-48e9-b26a-e2bae5770723';
  
  console.log('JWT_SECRET trouvé:', !!process.env.JWT_SECRET);
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret';
  
  const token = jwt.sign({ id: userId }, secret, { expiresIn: '1h' });

  const res = await fetch('http://localhost:5000/api/livekit/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ roomId })
  });
  const data = await res.json();
  console.log('ROUTE /api/livekit/token =>', data);
}
main();