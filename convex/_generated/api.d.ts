/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as assistant from "../assistant.js";
import type * as auth from "../auth.js";
import type * as budgets from "../budgets.js";
import type * as categories from "../categories.js";
import type * as conversations from "../conversations.js";
import type * as goals from "../goals.js";
import type * as pendingActions from "../pendingActions.js";
import type * as summary from "../summary.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  assistant: typeof assistant;
  auth: typeof auth;
  budgets: typeof budgets;
  categories: typeof categories;
  conversations: typeof conversations;
  goals: typeof goals;
  pendingActions: typeof pendingActions;
  summary: typeof summary;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
