import nodemailer from 'nodemailer';
import Email from '../models/Email.model';
import crypto from 'crypto';
import { User } from '../models/User.model';

export class EmailService {
  public readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendConfirmationEmail(userEmail: string): Promise<string> {
    const token = this.generateToken();
    const confirmationLink = `http://localhost:4200/login/confirm-email?token=${token}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    const html = `
      <h1>Confirmez votre adresse email</h1>
      <p>Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
      <a href="${confirmationLink}" target="_blank">
        Confirmer mon emailÒ
      </a>
      <p>Ce lien expire dans 24 heures.</p>
    `;

    const emailData = {
      to: userEmail,
      from: process.env.SMTP_FROM ?? 'noreply@votreapp.com',
      subject: 'Confirmation de votre compte',
      html,
      type: 'confirmation' as const,
      token,
      expiresAt,
    };

    const email = new Email(emailData);
    await email.save();

    await this.transporter.sendMail({
      to: userEmail,
      from: emailData.from,
      subject: emailData.subject,
      html,
    });

    return token;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const user = await User.findOne({ email });
    if (!user) throw new Error('Utilisateur non trouvé');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/confirm?token=${token}`;

    await this.transporter.sendMail({
      to: email,
      from: process.env.SMTP_FROM ?? 'noreply@votreapp.com',
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h1>Réinitialisation de votre mot de passe</h1>
        <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
        <a href="${resetLink}">Réinitialiser mon mot de passe</a>
        <p>Ce lien expirera dans 1 heure.</p>
      `,
    });
  }

  async verifyToken(
    token: string,
    type: 'confirmation' | 'reset_password',
  ): Promise<boolean> {
    const email = await Email.findOne({
      token,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (email) {
      email.isUsed = true;
      await email.save();
      return true;
    }

    return false;
  }
}

export const emailService = new EmailService();
