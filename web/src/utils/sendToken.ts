import { Response, CookieOptions } from "express";
import { IUser } from "../models/userModel";

const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const token = user.getJWTToken();

  // Use Express's CookieOptions for proper typing.
  // sameSite: 'strict' prevents CSRF.
  // secure: true in production forces HTTPS-only cookie transmission.
  const options: CookieOptions = {
    expires: new Date(
      Date.now() +
        Number(process.env.COOKIE_EXPIRE ?? 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Not accessible via document.cookie — prevents XSS token theft
    sameSite: "strict", // Prevents CSRF
    secure: process.env.NODE_ENV === "production", // HTTPS-only in prod
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user,
    token,
  });
};

export default sendToken;