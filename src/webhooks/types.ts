import { Request, Response } from "express";

export interface WebhookPayload {
  action?: string;
  installation?: {
    id?: string;
    target_type?: string;
    account?: {
      login?: string;
    };
  };
  repositories_added?: Array<{ id: number }>;
  repositories_removed?: Array<{ id: number }>;
  ref?: string;
  commits?: Array<any>;
  pull_request?: {
    title?: string;
    number?: number;
  };
  issue?: {
    title?: string;
    number?: number;
  };
  number?: number;
}

export interface WebhookContext {
  req: Request;
  res: Response;
  payload: WebhookPayload;
  eventType: string;
}

export type WebhookHandler = (context: WebhookContext) => Promise<void>;
