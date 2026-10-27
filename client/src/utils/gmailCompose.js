export const generateGmailComposeUrl = (to, subject, body, from = 'reedelsevier@gmail.com') => {
  const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
  const params = new URLSearchParams({
    authuser: from,
    from: from,
    to,
    su: subject,
    body: body
  });
  
  return `${baseUrl}&${params.toString()}`;
};

export const getApprovalEmailBody = (applicantName, jobTitle) => {
  return `Dear ${applicantName},

Congratulations!

We are pleased to inform you that you have successfully passed the initial screening for the position of ${jobTitle}.

Based on the evaluation of your qualifications, you have been shortlisted for the next stage of our recruitment process.

Our HR team will contact you shortly regarding your interview schedule.

Thank you for your interest in joining Reed Elsevier.

Best Regards,

Human Resources Department
Reed Elsevier (reedelsevier@gmail.com)`;
};

export const getRejectionEmailBody = (applicantName, jobTitle) => {
  return `Dear ${applicantName},

Thank you for applying for the position of ${jobTitle}.

After reviewing your application, we regret to inform you that you were not selected for the next stage.

We sincerely appreciate your interest and encourage you to apply again in the future.

Best Regards,

Human Resources Department
Reed Elsevier (reedelsevier@gmail.com)`;
};
