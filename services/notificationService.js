export const sendNotification = async (memberId, title, message) => {
  console.log(`[Notification] Member ${memberId}: ${title} - ${message}`);
  return true;
};