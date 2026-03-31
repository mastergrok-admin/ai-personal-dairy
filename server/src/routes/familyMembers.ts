import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "../controllers/familyMembers.js";

export const familyMembersRouter: RouterType = Router();

familyMembersRouter.use(authenticate);
familyMembersRouter.get("/", getFamilyMembers);
familyMembersRouter.post("/", createFamilyMember);
familyMembersRouter.put("/:id", updateFamilyMember);
familyMembersRouter.delete("/:id", deleteFamilyMember);
