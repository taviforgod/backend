export async function sendEmail({ to, subject, html }) {
  console.log('sendEmail stub:', to, subject);
  return true;
}

export async function sendSMS({ to, text }) {
  console.log('sendSMS stub:', to, text);
  return true;
}

export async function sendWhatsApp({ to, text }) {
  console.log('sendWhatsApp stub:', to, text);
  return true;
}
