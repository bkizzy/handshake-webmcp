import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AgreementError } from "@/src/lib/agreements/domain";

export function apiError(error: unknown) {
  if (error instanceof AgreementError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Check the required fields and try again." } },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: { code: "server_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
