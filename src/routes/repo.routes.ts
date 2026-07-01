import { Router } from "express";

import {
  analyzeRepoController,
  ingestRepoController,
} from "../controllers/repo.controller";
const router = Router();
router.post("/ingest", ingestRepoController);
router.post("/analyze", analyzeRepoController);

export default router;
