import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️  SENDGRID_API_KEY not found in environment variables. Email functionality will be disabled.');
}

/**
 * Send email using SendGrid
 * @param {Object} emailData - Email configuration
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.text - Plain text content
 * @param {string} [emailData.html] - HTML content (optional)
 * @param {string} [emailData.from] - Sender email (optional, uses default)
 * @param {Array} [emailData.attachments] - Email attachments (optional)
 */
export const sendEmail = async (emailData) => {
  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 Email would be sent to:', emailData.to);
      console.log('📧 Subject:', emailData.subject);
      console.log('📧 Message:', emailData.text);
      console.log('⚠️  SendGrid not configured - email simulation only');
      return { success: true, message: 'Email simulated (SendGrid not configured)' };
    }

    // Default sender email
    const fromEmail = emailData.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@jobplatform.com';
    
    // Prepare email message
    const msg = {
      to: emailData.to,
      from: {
        email: fromEmail,
        name: process.env.SENDGRID_FROM_NAME || 'Job Platform'
      },
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html || emailData.text.replace(/\n/g, '<br>'),
    };

    // Add attachments if provided
    if (emailData.attachments && emailData.attachments.length > 0) {
      msg.attachments = emailData.attachments;
    }

    // Send email
    const response = await sgMail.send(msg);
    
    console.log('✅ Email sent successfully to:', emailData.to);
    return { 
      success: true, 
      message: 'Email sent successfully',
      messageId: response[0].headers['x-message-id']
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    // Handle SendGrid specific errors
    if (error.response) {
      const { message, code, response } = error;
      console.error('SendGrid Error:', {
        message,
        code,
        body: response?.body
      });
      
      throw new Error(`Email sending failed: ${message}`);
    }
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

/**
 * Send bulk emails (with rate limiting)
 * @param {Array} emailList - Array of email data objects
 * @param {number} [batchSize=10] - Number of emails to send per batch
 * @param {number} [delay=1000] - Delay between batches in milliseconds
 */
export const sendBulkEmails = async (emailList, batchSize = 10, delay = 1000) => {
  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };

  // Process emails in batches to avoid rate limiting
  for (let i = 0; i < emailList.length; i += batchSize) {
    const batch = emailList.slice(i, i + batchSize);
    
    // Send batch of emails
    const batchPromises = batch.map(async (emailData, index) => {
      try {
        await sendEmail(emailData);
        results.sent++;
        return { success: true, email: emailData.to };
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: emailData.to,
          error: error.message
        });
        return { success: false, email: emailData.to, error: error.message };
      }
    });

    // Wait for batch to complete
    await Promise.allSettled(batchPromises);
    
    // Delay between batches (except for the last batch)
    if (i + batchSize < emailList.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`📊 Bulk email results: ${results.sent} sent, ${results.failed} failed`);
  return results;
};

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Create email template for job application status updates
 * @param {Object} data - Template data
 * @param {string} data.candidateName - Candidate's name
 * @param {string} data.jobTitle - Job title
 * @param {string} data.companyName - Company name
 * @param {string} data.status - Application status
 * @param {string} [data.message] - Custom message
 */
export const createStatusUpdateTemplate = (data) => {
  const { candidateName, jobTitle, companyName, status, message } = data;
  
  let subject, body;
  
  switch (status) {
    case 'hired':
      subject = `Congratulations! You've been selected for ${jobTitle}`;
      body = `Dear ${candidateName},

We're excited to inform you that you have been selected for the position of ${jobTitle} at ${companyName}.

${message || "We'll be in touch soon with next steps regarding your onboarding process."}

Congratulations and welcome to the team!

Best regards,
${companyName} Team`;
      break;
      
    case 'rejected':
      subject = `Update on your application for ${jobTitle}`;
      body = `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} position at ${companyName}.

After careful consideration, we have decided to move forward with other candidates at this time.

${message || "We appreciate the time you invested in the application process and encourage you to apply for future opportunities."}

Best regards,
${companyName} Team`;
      break;
      
    case 'interview':
      subject = `Interview Invitation - ${jobTitle} at ${companyName}`;
      body = `Dear ${candidateName},

We're pleased to inform you that your application for the ${jobTitle} position at ${companyName} has been reviewed, and we would like to invite you for an interview.

${message || "We'll be in touch soon with more details about the interview process."}

Best regards,
${companyName} Team`;
      break;
      
    case 'shortlisted':
      subject = `Your application for ${jobTitle} has been shortlisted`;
      body = `Dear ${candidateName},

Good news! Your application for the ${jobTitle} position at ${companyName} has been shortlisted.

${message || "We're currently reviewing shortlisted candidates and will be in touch with next steps soon."}

Best regards,
${companyName} Team`;
      break;
      
    default:
      subject = `Update on your application for ${jobTitle}`;
      body = `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} position at ${companyName}.

${message || "We wanted to provide you with an update on your application status. We'll be in touch with next steps soon."}

Best regards,
${companyName} Team`;
  }
  
  return {
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>')
  };
};

/**
 * Create email template for interview scheduling
 * @param {Object} data - Interview data
 */
export const createInterviewTemplate = (data) => {
  const { candidateName, jobTitle, companyName, interviewDate, interviewTime, interviewType, location, meetingLink } = data;
  
  const subject = `Interview Scheduled - ${jobTitle} at ${companyName}`;
  
  let body = `Dear ${candidateName},

Your interview for the ${jobTitle} position at ${companyName} has been scheduled.

Interview Details:
- Date: ${interviewDate}
- Time: ${interviewTime}
- Type: ${interviewType}`;

  if (interviewType === 'video' && meetingLink) {
    body += `
- Meeting Link: ${meetingLink}`;
  } else if (interviewType === 'in_person' && location) {
    body += `
- Location: ${location}`;
  }

  body += `

Please confirm your availability by replying to this email.

We look forward to speaking with you!

Best regards,
${companyName} Team`;

  return {
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>')
  };
};

export default {
  sendEmail,
  sendBulkEmails,
  validateEmail,
  createStatusUpdateTemplate,
  createInterviewTemplate
};
