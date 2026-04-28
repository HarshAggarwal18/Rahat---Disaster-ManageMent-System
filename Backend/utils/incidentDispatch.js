const distanceKm = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (value) => (value * Math.PI) / 180;
  const lat1 = a.lat;
  const lon1 = a.lng;
  const lat2 = b.lat;
  const lon2 = b.lng;
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Number.POSITIVE_INFINITY;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const aCalc = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const cCalc = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return 6371 * cCalc;
};

const scoreVolunteer = (incident, volunteer) => {
  const distance = distanceKm(incident.location, volunteer.currentLocation);
  const distanceScore = distance === Number.POSITIVE_INFINITY ? 0 : Math.max(0, 1 - distance / 20);
  const skills = (volunteer.skills || []).map(s => s.toLowerCase());
  const typeMatch = skills.includes(incident.type) ? 1 : 0;
  const availabilityScore = volunteer.availability ? 1 : 0.4;

  const score = (distanceScore * 0.55) + (typeMatch * 0.3) + (availabilityScore * 0.15);

  return {
    distanceKm: Number.isFinite(distance) ? Number(distance.toFixed(2)) : null,
    score: Number(score.toFixed(2)),
    typeMatch
  };
};

const getVolunteerRecommendations = (incident, volunteers) => {
  return volunteers.map(volunteer => {
    const { distanceKm: distance, score, typeMatch } = scoreVolunteer(incident, volunteer);
    return {
      id: volunteer._id,
      name: `${volunteer.firstName} ${volunteer.lastName}`,
      email: volunteer.email,
      availability: volunteer.availability,
      skills: volunteer.skills || [],
      distanceKm: distance,
      score,
      typeMatch
    };
  }).sort((a, b) => b.score - a.score);
};

module.exports = {
  getVolunteerRecommendations
};
