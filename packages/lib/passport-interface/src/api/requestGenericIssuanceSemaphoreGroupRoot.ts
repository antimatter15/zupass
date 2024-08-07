import urljoin from "url-join";
import { GenericIssuanceSemaphoreGroupRootResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Returns the latest root hash for a group.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceSemaphoreGroupRoot(
  zupassServerUrl: string,
  pipelineId: string,
  groupId: string
): Promise<GenericIssuanceSemaphoreGroupRootResponse> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/semaphore",
      pipelineId,
      groupId,
      "latest-root"
    ),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    })
  );
}

export type GenericIssuanceSemaphoreGroupRootResponse =
  APIResult<GenericIssuanceSemaphoreGroupRootResponseValue>;
