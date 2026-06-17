import express from "express";
import healthRoutes from "./routes/health.routes";
import repoRoutes from "./routes/repo.routes";
const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/health", healthRoutes);

app.use("/api/repos", repoRoutes);
app.listen(PORT, () => {
  console.log("server is running ");
});
