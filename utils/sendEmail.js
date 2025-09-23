export default async (to, subject, text) => {
  // Integrate real nodemailer config here
  console.log(`Email to ${to}: ${subject} - ${text}`);
};