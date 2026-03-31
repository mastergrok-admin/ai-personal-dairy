import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createInvite, getMyInvites, acceptInviteHandler } from "../controllers/invites.js";

export const invitesRouter: RouterType = Router();

// Public — accept invite link
invitesRouter.get("/accept", acceptInviteHandler);

// Authenticated — create and list invites
invitesRouter.use(authenticate);
invitesRouter.post("/", createInvite);
invitesRouter.get("/", getMyInvites);
