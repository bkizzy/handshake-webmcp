import { processAgreementAction } from "@/src/lib/agreements/action-handler";
import { apiError } from "@/src/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await processAgreementAction(request, id, "agent");
  } catch (error) {
    return apiError(error);
  }
}
