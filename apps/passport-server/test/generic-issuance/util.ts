import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import {
  Credential,
  CredentialManager,
  CredentialPayload,
  CredentialRequest,
  InfoResult,
  PODBOX_CREDENTIAL_REQUEST,
  PodboxTicketActionResult,
  PollFeedResult,
  requestPipelineInfo,
  requestPodboxTicketAction,
  requestPollFeed
} from "@pcd/passport-interface";
import {
  PCDCollection,
  expectIsReplaceInFolderAction
} from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  PODTicketPCD,
  PODTicketPCDPackage,
  PODTicketPCDTypeName
} from "@pcd/pod-ticket-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import {
  Pipeline,
  PipelineUser
} from "../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../src/types";
import { expectFalse, expectTrue } from "../util/util";

/**
 * Testing that the Generic Issuance backend calculates {@link InfoResult} about
 * pipeline {@link PretixPipeline} correctly by requesting it from the Generic
 * Issuance API routes.
 *
 * This endpoint is used by the Generic Issuance frontend to assist a user in
 * managing their {@link Pipeline}.
 *
 * TODO: incorporate auth
 */
export async function checkPipelineInfoEndpoint(
  giBackend: Zupass,
  pipeline: Pipeline
): Promise<void> {
  const pipelineInfoResult: InfoResult = await requestPipelineInfo(
    "todo",
    giBackend.expressContext.localEndpoint,
    pipeline.id
  );
  expectFalse(pipelineInfoResult.success);
}

export function assertUserMatches(
  expectedUser: PipelineUser,
  actualUser: PipelineUser | undefined
): void {
  expect(actualUser).to.exist;
  expect(actualUser?.email).to.eq(expectedUser.email);
  expect(actualUser?.id).to.eq(expectedUser.id);
  expect(actualUser?.isAdmin).to.eq(expectedUser.isAdmin);
}

/**
 * Receivers of {@link EdDSATicketPCD} can 'check in' other holders of
 * tickets issued by the same feed, if their ticket's 'product type' has
 * been configured by the owner of the pipeline of this feed.
 */
export async function requestCheckInPipelineTicket(
  /**
   * {@link Pipeline}s can have a {@link CheckinCapability}
   */
  checkinRoute: string,
  zupassEddsaPrivateKey: string,
  checkerEmail: string,
  checkerIdentity: Identity,
  ticket: EdDSATicketPCD
): Promise<PodboxTicketActionResult> {
  const ticketCheckerFeedCredential = await makeTestCredential(
    checkerIdentity,
    PODBOX_CREDENTIAL_REQUEST,
    checkerEmail,
    zupassEddsaPrivateKey
  );

  return requestPodboxTicketAction(
    checkinRoute,
    ticketCheckerFeedCredential,
    {
      checkin: true
    },
    ticket.claim.ticket.ticketId,
    ticket.claim.ticket.eventId
  );
}

/**
 * Extracts tickets from {@link PollFeedResult}. Expects tickets to be returned
 * in a single {@link ReplaceInFolderAction}. Checks that the first and only
 * {@link PCDAction}
 */
export function getTicketsFromFeedResponse(
  expectedFolder: string,
  result: PollFeedResult
): Promise<(EdDSATicketPCD | PODTicketPCD)[]> {
  expectTrue(result.success);
  const secondAction = result.value.actions[1];
  expectIsReplaceInFolderAction(secondAction);
  expect(secondAction.folder).to.eq(expectedFolder);
  return Promise.all(
    secondAction.pcds.map((t) => {
      if (t.type === EdDSATicketPCDTypeName) {
        return EdDSATicketPCDPackage.deserialize(t.pcd);
      }
      if (t.type === PODTicketPCDTypeName) {
        return PODTicketPCDPackage.deserialize(t.pcd);
      }
      throw new Error("Unexpected PCD type");
    })
  );
}

/**
 * Requests tickets from a pipeline that is issuing {@link EdDSATicketPCD}s.
 */
export async function requestTicketsFromPipeline(
  expectedFolder: string,
  /**
   * Generated by {@code makeGenericIssuanceFeedUrl}.
   */
  feedUrl: string,
  feedId: string,
  /**
   * Rather than get an {@link EmailPCD} issued by the email feed
   * Zupass Server hosts, for testing purposes, we're generating
   * the email PCD on the fly inside this function using this key.
   */
  zupassEddsaPrivateKey: string,
  /**
   * Zupass Server attests that the given email address...
   */
  email: string,
  /**
   * Is owned by this identity.
   */
  identity: Identity
): Promise<(EdDSATicketPCD | PODTicketPCD)[]> {
  const ticketPCDResponse = await requestPollFeed(feedUrl, {
    feedId: feedId,
    pcd: await makeTestCredential(
      identity,
      PODBOX_CREDENTIAL_REQUEST,
      email,
      zupassEddsaPrivateKey
    )
  });

  return getTicketsFromFeedResponse(expectedFolder, ticketPCDResponse);
}

/**
 * Makes a credential for a given email address and Semaphore identity, by
 * generating a new Email PCD using the provided private key.
 *
 * Uses {@link testCredentialCache} to avoid regenerating the same credential
 * repeately.
 */
export async function makeTestCredential(
  identity: Identity,
  request: CredentialRequest,
  email?: string,
  zupassEddsaPrivateKey?: string
): Promise<Credential> {
  if (request.pcdType === "email-pcd") {
    if (!email || !zupassEddsaPrivateKey) {
      throw new Error(
        "Can't create a credential containing an EmailPCD without email address and private key"
      );
    }
    const emailPCD = await proveEmailPCD(
      email,
      zupassEddsaPrivateKey,
      identity
    );
    // Credential Manager will need to be able to look up the Email PCD, and use
    // an identity. We instantiate a PCDCollection here, mirroring the usage on
    // the client.
    const credentialManager = new CredentialManager(
      identity,
      new PCDCollection([EmailPCDPackage], [emailPCD]),
      new Map()
    );
    return credentialManager.requestCredential(request);
  } else {
    // No Email PCD required here
    const credentialManager = new CredentialManager(
      identity,
      new PCDCollection([], []),
      new Map()
    );
    return credentialManager.requestCredential(request);
  }
}

/**
 * Sign a credential payload.
 * Only use this to generate "incorrect" credentials, such as those containing
 * invalid PCDs, expired timestamps, and so on, otherwise use
 * {@link makeTestCredential} above.
 */
export async function signCredentialPayload(
  identity: Identity,
  payload: CredentialPayload
): Promise<Credential> {
  const signaturePCD = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({
          identity
        })
      )
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: JSON.stringify(payload)
    }
  });

  return SemaphoreSignaturePCDPackage.serialize(signaturePCD);
}

export async function proveEmailPCD(
  email: string,
  zupassEddsaPrivateKey: string,
  identity: Identity
): Promise<EmailPCD> {
  return EmailPCDPackage.prove({
    privateKey: {
      value: zupassEddsaPrivateKey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: "email-id",
      argumentType: ArgumentTypeName.String
    },
    emailAddress: {
      value: email,
      argumentType: ArgumentTypeName.String
    },
    semaphoreId: {
      value: identity.commitment.toString(),
      argumentType: ArgumentTypeName.String
    }
  });
}
