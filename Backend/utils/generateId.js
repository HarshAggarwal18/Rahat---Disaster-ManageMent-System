// Generate unique IDs for incidents and users
const generateIncidentId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INC-${year}-${random}`;
};

const generateUserId = () => {
  const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `USER-${random}`;
};

module.exports = {
  generateIncidentId,
  generateUserId
};

