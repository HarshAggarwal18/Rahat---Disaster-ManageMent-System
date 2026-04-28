const nodemailer = require('nodemailer');

const createTransport = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('Email not configured: missing SMTP_USER/SMTP_PASS');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransport();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const recipients = Array.isArray(to) ? to.join(',') : to;

  await transporter.sendMail({
    from,
    to: recipients,
    subject,
    html
  });
};

const incidentReportedEmail = (incident) => ({
  subject: `New Incident Reported: ${incident.id}`,
  html: `
    <h2>New Incident Reported</h2>
    <p><strong>ID:</strong> ${incident.id}</p>
    <p><strong>Type:</strong> ${incident.type}</p>
    <p><strong>Severity:</strong> ${incident.severity}</p>
    <p><strong>Description:</strong> ${incident.description}</p>
    <p><strong>People Required:</strong> ${incident.peopleRequired || 1}</p>
  `
});

const incidentAssignedEmail = (incident, volunteer) => ({
  subject: `Incident Assigned to You: ${incident.id}`,
  html: `
    <h2>Incident Assigned</h2>
    <p><strong>ID:</strong> ${incident.id}</p>
    <p><strong>Type:</strong> ${incident.type}</p>
    <p><strong>Severity:</strong> ${incident.severity}</p>
    <p><strong>Description:</strong> ${incident.description}</p>
    <p><strong>People Required:</strong> ${incident.peopleRequired || 1}</p>
    <p><strong>Assigned To:</strong> ${volunteer.firstName} ${volunteer.lastName}</p>
  `
});

module.exports = {
  sendEmail,
  incidentReportedEmail,
  incidentAssignedEmail
};
