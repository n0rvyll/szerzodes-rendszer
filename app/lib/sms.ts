// lib/sms.ts
//import Twilio from 'twilio';

//const sid = process.env.TWILIO_ACCOUNT_SID!;
//const token = process.env.TWILIO_AUTH_TOKEN!;
//const from = process.env.TWILIO_FROM!; // pl. +1... vagy whatsapp:+14155238886

//const client = sid && token ? Twilio(sid, token) : null;

//export async function sendSms(to: string, body: string) {
//  if (!client) throw new Error('Twilio nincs konfigurálva');
//  const msg = await client.messages.create({ from, to, body });
//  return msg.sid;
//}