import { DisplayOptions, PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { POD } from "@pcd/pod";
import { requireDefinedParameter } from "@pcd/util";
import { v4 as uuid } from "uuid";
import {
  PODTicketPCD,
  PODTicketPCDArgs,
  PODTicketPCDClaim,
  PODTicketPCDProof,
  PODTicketPCDTypeName
} from "./PODTicketPCD";
import { TicketDataSchema } from "./schema";
import {
  checkTicketData,
  podTicketPCDToPOD,
  ticketDataToPODEntries
} from "./utils";

/**
 * Creates a new {@link PODTicketPCD} by generating an {@link PODTicketPCDProof}
 * and deriving an {@link PODTicketPCDClaim} from the given {@link PODTicketPCDArgs}.
 */
export async function prove(args: PODTicketPCDArgs): Promise<PODTicketPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.ticket.value) {
    throw new Error("missing ticket value");
  }

  // Will throw if the ticket data is invalid
  const ticketData = checkTicketData(args.ticket.value);

  const pod = POD.sign(
    ticketDataToPODEntries(ticketData),
    args.privateKey.value
  );

  const id = args.id.value ?? uuid();

  return new PODTicketPCD(
    id,
    { ticket: ticketData, signerPublicKey: pod.signerPublicKey },
    { signature: pod.signature }
  );
}

/**
 * Verifies a POD Ticket PCD by converting it to a PODPCD and verifying it.
 */
export async function verify(pcd: PODTicketPCD): Promise<boolean> {
  try {
    // Convert this PCD to POD format for verification
    return podTicketPCDToPOD(pcd).verifySignature();
  } catch (e) {
    console.error("Verifying invalid POD data:", e);
    return false;
  }
}

/**
 * Serializes a {@link PODTicketPCD}.
 * @param pcd The POD Ticket PCD to be serialized.
 * @returns The serialized version of the POD Ticket PCD.
 */
export async function serialize(
  pcd: PODTicketPCD
): Promise<SerializedPCD<PODTicketPCD>> {
  return {
    type: PODTicketPCDTypeName,
    pcd: JSON.stringify({
      id: pcd.id,
      claim: pcd.claim,
      proof: pcd.proof
    })
  } as SerializedPCD<PODTicketPCD>;
}

/**
 * Deserializes a serialized {@link PODTicketPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the POD Ticket PCD.
 */
export async function deserialize(serialized: string): Promise<PODTicketPCD> {
  const deserialized = JSON.parse(serialized) as PODTicketPCD;

  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(deserialized.claim.ticket, "ticket");
  requireDefinedParameter(
    deserialized.claim.signerPublicKey,
    "signerPublicKey"
  );
  requireDefinedParameter(deserialized.proof, "proof");
  requireDefinedParameter(deserialized.proof.signature, "signature");
  TicketDataSchema.parse(deserialized.claim.ticket);

  return new PODTicketPCD(
    deserialized.id,
    deserialized.claim,
    deserialized.proof
  );
}

export function ticketDisplayName(
  eventName?: string,
  ticketName?: string
): string {
  let displayName = "";

  if (eventName && eventName?.length > 0) {
    displayName += eventName;
  }

  if (ticketName && ticketName?.length > 0) {
    if (displayName.length === 0) {
      displayName = ticketName;
    } else {
      displayName += ` (${ticketName})`;
    }
  }

  return displayName.length === 0 ? "untitled" : displayName;
}
/**
 * Provides the information about the {@link PODTicketPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The POD Ticket PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(
  pcd: PCD<PODTicketPCDClaim, PODTicketPCDProof>
): DisplayOptions {
  const ticketData = pcd.claim.ticket;
  if (!ticketData) {
    return {
      header: "Ticket",
      displayName: "ticket-" + pcd.id.substring(0, 4)
    };
  }

  const displayName = ticketDisplayName(
    ticketData.eventName,
    ticketData.ticketName
  );

  let header = displayName;
  if (ticketData.isRevoked) {
    header = `[CANCELED] ${displayName}`;
  } else if (ticketData.isConsumed) {
    header = `[SCANNED] ${displayName}`;
  }

  return {
    header,
    displayName
  };
}

/**
 * The PCD package of the POD Ticket PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const PODTicketPCDPackage: PCDPackage<
  PODTicketPCDClaim,
  PODTicketPCDProof,
  PODTicketPCDArgs,
  unknown
> = {
  name: PODTicketPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
