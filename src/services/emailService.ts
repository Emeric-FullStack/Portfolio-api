import nodemailer from "nodemailer";
import Email from "../models/Email";
import crypto from "crypto";

export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      ignoreTLS: true
    });
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async sendConfirmationEmail(userEmail: string): Promise<string> {
    const token = this.generateToken();
    const confirmationLink = `http://localhost:4200/login/confirm-email?token=${token}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    const html = `
      <h1>Confirmez votre adresse email</h1>
      <p>Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
      <a href="${confirmationLink}" target="_blank">
        Confirmer mon email
      </a>
      <p>Ce lien expire dans 24 heures.</p>
    `;

    const emailData = {
      to: userEmail,
      from: process.env.SMTP_FROM ?? "noreply@votreapp.com",
      subject: "Confirmation de votre compte",
      html,
      type: "confirmation" as const,
      token,
      expiresAt
    };

    const email = new Email(emailData);
    await email.save();

    await this.transporter.sendMail({
      to: userEmail,
      from: emailData.from,
      subject: emailData.subject,
      html
    });

    return token;
  }

  async sendPasswordResetEmail(userEmail: string): Promise<string> {
    const token = this.generateToken();
    const resetLink = `http://localhost:4200/reset-password/confirm?token=${token}`;
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 heure

    const html = `
      <h1>Réinitialisation de votre mot de passe</h1>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetLink}" target="_blank">
        Réinitialiser mon mot de passe
      </a>
      <p>Ce lien expire dans 1 heure.</p>
    `;

    const emailData = {
      to: userEmail,
      from: process.env.SMTP_FROM ?? "noreply@votreapp.com",
      subject: "Réinitialisation de votre mot de passe",
      html,
      type: "reset_password" as const,
      token,
      expiresAt
    };

    const email = new Email(emailData);
    await email.save();

    await this.transporter.sendMail({
      to: userEmail,
      from: emailData.from,
      subject: emailData.subject,
      html
    });

    return token;
  }

  async verifyToken(
    token: string,
    type: "confirmation" | "reset_password"
  ): Promise<boolean> {
    const email = await Email.findOne({
      token,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() }
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
