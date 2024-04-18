import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";
import type { PODPCDProof } from "@pcd/pod-pcd";
import type { IPODTicketData } from "./schema";

/**
 * The globally unique type name of the {@link PODTicketPCD}.
 */
export const PODTicketPCDTypeName = "pod-ticket-pcd";

/**
 * Copied from {@link TicketCategory} in {@link EdDSATicketPCD}.
 */
export enum TicketCategory {
  ZuConnect = 0,
  Devconnect = 1,
  PcdWorkingGroup = 2,
  Zuzalu = 3,
  Generic = 4
}

/**
 * Defines the essential parameters required for creating an {@link PODTicketPCD}.
 */
export type PODTicketPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * A {@link IPODTicketData} object containing ticket information that is encoded into this PCD.
   */
  ticket: ObjectArgument<IPODTicketData>;

  /**
   * A string that uniquely identifies an {@link PODTicketPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};

/**
 * Defines the claim, consisting of ticket data and the public key of the
 * signer.
 */
export interface PODTicketPCDClaim {
  ticket: IPODTicketData;
  signerPublicKey: string;
}

/**
 * Proofs for POD ticket PCDs are identical to POD PCDs, consisting solely of
 * a string representation of a signature.
 */
export type PODTicketPCDProof = PODPCDProof;

export class PODTicketPCD implements PCD<PODTicketPCDClaim, PODTicketPCDProof> {
  public readonly type = PODTicketPCDTypeName;
  public readonly claim: PODTicketPCDClaim;
  public readonly proof: PODTicketPCDProof;
  public readonly id: string;

  /**
   * The PODTicketPCD consists of a claim about {@link IPODTicketData}, and a
   * standard {@link PODPCDProof}.
   */
  public constructor(
    id: string,
    claim: PODTicketPCDClaim,
    proof: PODTicketPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

/**
 * Returns true if {@link pcd} is an {@link EdDSATicketPCD} or false otherwise.
 */
export function isPODTicketPCD(pcd: PCD): pcd is PODTicketPCD {
  return pcd.type === PODTicketPCDTypeName;
}
