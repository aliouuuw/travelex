/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as auth from "../auth.js";
import type * as bookingConfirmation from "../bookingConfirmation.js";
import type * as citiesStations from "../citiesStations.js";
import type * as countries from "../countries.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as luggagePolicies from "../luggagePolicies.js";
import type * as passwordReset from "../passwordReset.js";
import type * as payments from "../payments.js";
import type * as reservations from "../reservations.js";
import type * as reusableCitiesStations from "../reusableCitiesStations.js";
import type * as routeTemplates from "../routeTemplates.js";
import type * as signupRequests from "../signupRequests.js";
import type * as tripSearch from "../tripSearch.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  auth: typeof auth;
  bookingConfirmation: typeof bookingConfirmation;
  citiesStations: typeof citiesStations;
  countries: typeof countries;
  http: typeof http;
  invitations: typeof invitations;
  luggagePolicies: typeof luggagePolicies;
  passwordReset: typeof passwordReset;
  payments: typeof payments;
  reservations: typeof reservations;
  reusableCitiesStations: typeof reusableCitiesStations;
  routeTemplates: typeof routeTemplates;
  signupRequests: typeof signupRequests;
  tripSearch: typeof tripSearch;
  trips: typeof trips;
  users: typeof users;
  vehicles: typeof vehicles;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
