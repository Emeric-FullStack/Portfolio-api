import { RequestHandler } from 'express';
import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV === 'development';

const transporter = nodemailer.createTransport(
  isDev
    ? {
        host: 'localhost',
        port: 1025,
        secure: false,
        tls: {
          rejectUnauthorized: false,
        },
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      },
);

export const sendContactEmail: RequestHandler = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const mailOptions = {
      from: isDev ? 'test@localhost' : process.env.EMAIL_USER,
      to: isDev ? 'test@localhost' : process.env.EMAIL_RECIPIENT,
      subject: `Contact Portfolio - ${subject}`,
      html: `
        <h3>Nouveau message de contact</h3>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'email" });
  }
};
