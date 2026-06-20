import express from "express";
import healthRoutes from "./routes/health.routes";
import cors from "cors";
import repoRoutes from "./routes/repo.routes";
import { config } from "./config";

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
app.use("/api/health", healthRoutes);

app.use("/api/repos", repoRoutes);
app.listen(PORT, () => {
  console.log(`server is running on ${config.PORT}`);
});
