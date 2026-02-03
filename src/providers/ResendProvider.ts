import { Resend } from 'resend';

const RESEND_API_KEY =
  process.env.RESEND_API_KEY || 're_bb7Nq4t2_Pu7N2LZk4NA4dm9aL3z7zjgw';

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_SENDER_EMAIL =
  process.env.ADMIN_SENDER_EMAIL || 'onboarding@resend.dev';

//Tao 1 cai instance cua Resend de su dung

const resendInstance = new Resend(RESEND_API_KEY);

//Function de gui mail
const sendEmail = async ({ to, subject, html }) => {
  try {
    const data = await resendInstance.emails.send({
      from: ADMIN_SENDER_EMAIL,
      to, // neu chua co valid domain thi chi gui den email ma ban da dang ky tai khoan resend thoi
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.log('ResendProvider - sendEmail error:', error);
    throw error;
  }
};

export const ResendProvider = {
  sendEmail,
};
