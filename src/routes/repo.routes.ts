import { Router } from "express";

import { analyzeRepoController } from "../controllers/repo.controller";
const router = Router();
router.post("/analyze", analyzeRepoController);

export default router;
