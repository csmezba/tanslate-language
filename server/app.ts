import express from "express";
import authRouter from "./routes/auth";
import translateRouter from "./routes/translate";

const app = express();

app.use(express.json());

// Main API Routes
app.use("/api/auth", authRouter);
app.use("/api", translateRouter);

export default app;
