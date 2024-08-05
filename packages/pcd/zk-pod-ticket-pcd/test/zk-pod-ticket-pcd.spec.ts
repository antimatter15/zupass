import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { PUBLIC_KEY_REGEX } from "@pcd/pod";
import {
  IPODTicketData,
  PODTicketPCD,
  PODTicketPCDPackage,
  TicketCategory
} from "@pcd/pod-ticket-pcd";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import path from "path";
import RandExp from "randexp";
import { v4 as uuidv4 } from "uuid";
import {
  checkClaimAgainstProofRequest,
  makeProofRequest,
  PODTicketFieldsToReveal,
  TicketMatchPatterns,
  ZKPODTicketPCD,
  ZKPODTicketPCDArgs
} from "../src";
import { ZKPODTicketPCDPackage } from "../src/ZKPODTicketPCDPackage";

export const GPC_TEST_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../lib/gpcircuits/artifacts/test"
);

const identity1 = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

async function makeSerializedIdentityPCD(
  identity: Identity
): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identity: identity
  });

  return await SemaphoreIdentityPCDPackage.serialize(identityPCD);
}

function makeProveArgs(
  serializedTicket: SerializedPCD<PODTicketPCD>,
  serializedIdentity: SerializedPCD<SemaphoreIdentityPCD>,
  fieldsToReveal: PODTicketFieldsToReveal,
  ticketPatterns: TicketMatchPatterns,
  watermark: string = "watermark",
  externalNullifier: string = "externalNullifier"
): ZKPODTicketPCDArgs {
  return {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      value: serializedTicket,
      validatorParams: {
        ticketPatterns,
        notFoundMessage: "Not found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: serializedIdentity
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal
    },
    revealSignerPublicKey: {
      argumentType: ArgumentTypeName.Boolean,
      value: true
    },
    watermark: { argumentType: ArgumentTypeName.String, value: watermark },
    externalNullifier: {
      argumentType: ArgumentTypeName.String,
      value: externalNullifier
    }
  };
}

describe("zk-pod-ticket-pcd should work", async function () {
  use(chaiAsPromised);
  await ZKPODTicketPCDPackage.init?.({
    zkArtifactPath: GPC_TEST_ARTIFACTS_PATH
  });

  let zkTicketPCD: ZKPODTicketPCD;

  const ticketData: IPODTicketData = {
    eventId: uuidv4(),
    productId: uuidv4(),
    ticketId: uuidv4(),
    timestampConsumed: 1,
    timestampSigned: 1,
    attendeeSemaphoreId: identity1.getCommitment().toString(),
    isConsumed: true,
    eventName: "Event 1",
    ticketName: "Ticket 1",
    isRevoked: false,
    ticketCategory: TicketCategory.Generic,
    attendeeName: "Attendee 1",
    attendeeEmail: "attendee1@example.com"
  };

  const ticketPCD = await PODTicketPCDPackage.prove({
    ticket: {
      argumentType: ArgumentTypeName.Object,
      value: ticketData
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: prvKey
    },
    id: {
      argumentType: ArgumentTypeName.String,
      value: uuidv4()
    },
    extraEntries: {
      argumentType: ArgumentTypeName.Object,
      value: {}
    }
  });

  const pubKey = ticketPCD.claim.signerPublicKey;

  const matchBySignerPublicKeyEventIdAndProductId = {
    signerPublicKey: pubKey,
    events: [
      {
        id: ticketData.eventId,
        productIds: [ticketData.productId]
      }
    ]
  };

  it("should work with a valid ticket", async function () {
    const serializedTicket = await PODTicketPCDPackage.serialize(ticketPCD);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const pubKey = ticketPCD.claim.signerPublicKey;

    const proveArgs = makeProveArgs(serializedTicket, serializedIdentity, {}, [
      matchBySignerPublicKeyEventIdAndProductId
    ]);

    zkTicketPCD = await ZKPODTicketPCDPackage.prove(proveArgs);

    expect(zkTicketPCD).to.exist;
    expect(zkTicketPCD.claim.watermark.value).to.equal("watermark");
    expect(zkTicketPCD.claim.externalNullifier.value).to.equal(
      "externalNullifier"
    );
    expect(zkTicketPCD.claim.signerPublicKey).to.equal(pubKey);

    expect(await ZKPODTicketPCDPackage.verify(zkTicketPCD)).to.equal(true);
    expect(
      checkClaimAgainstProofRequest(
        zkTicketPCD.claim,
        makeProofRequest(proveArgs)
      )
    ).to.not.throw;
  });

  it("should reveal fields", async function () {
    const serializedTicket = await PODTicketPCDPackage.serialize(ticketPCD);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const pubKey = ticketPCD.claim.signerPublicKey;

    const proveArgs = makeProveArgs(
      serializedTicket,
      serializedIdentity,
      {
        revealAttendeeEmail: true,
        revealAttendeeName: true
      },
      [matchBySignerPublicKeyEventIdAndProductId]
    );
    zkTicketPCD = await ZKPODTicketPCDPackage.prove(proveArgs);

    expect(zkTicketPCD).to.exist;
    expect(zkTicketPCD.claim.watermark.value).to.equal("watermark");
    expect(zkTicketPCD.claim.externalNullifier.value).to.equal(
      "externalNullifier"
    );
    expect(zkTicketPCD.claim.signerPublicKey).to.equal(pubKey);
    expect(zkTicketPCD.claim.partialTicket.attendeeEmail).to.equal(
      ticketData.attendeeEmail
    );
    expect(zkTicketPCD.claim.partialTicket.attendeeName).to.equal(
      ticketData.attendeeName
    );

    expect(await ZKPODTicketPCDPackage.verify(zkTicketPCD)).to.equal(true);
    expect(
      checkClaimAgainstProofRequest(
        zkTicketPCD.claim,
        makeProofRequest(proveArgs)
      )
    ).to.not.throw;
    expect(zkTicketPCD.claim.config.circuitIdentifier).to.equal(
      // This is the smaller of the two circuit identifiers, which is used here
      // because we are only using 5 entries: the two revealed fields, plus
      // the mandatory Semaphore ID, event ID, and product ID.
      "proto-pod-gpc_1o-5e-5md-0nv-1x200l-1x3t"
    );
  });

  it("should reveal all of the fields", async function () {
    const serializedTicket = await PODTicketPCDPackage.serialize(ticketPCD);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const pubKey = ticketPCD.claim.signerPublicKey;

    const proveArgs: ZKPODTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedTicket,
        validatorParams: {
          ticketPatterns: [
            {
              signerPublicKey: pubKey,
              events: [
                {
                  id: ticketData.eventId,
                  productIds: [ticketData.productId]
                }
              ]
            }
          ],
          notFoundMessage: "Not found"
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedIdentity
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: {
          revealAttendeeEmail: true,
          revealAttendeeName: true,
          revealTimestampConsumed: true,
          revealTimestampSigned: true,
          revealIsConsumed: true,
          revealIsRevoked: true,
          revealEventId: true,
          revealProductId: true,
          revealTicketId: true,
          revealTicketCategory: true,
          revealAttendeeSemaphoreId: true
        }
      },
      revealSignerPublicKey: {
        argumentType: ArgumentTypeName.Boolean,
        value: true
      },
      watermark: { argumentType: ArgumentTypeName.String, value: "0" },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        value: "0"
      }
    };

    zkTicketPCD = await ZKPODTicketPCDPackage.prove(proveArgs);

    expect(zkTicketPCD).to.exist;
    expect(zkTicketPCD.claim.watermark.value).to.equal("0");
    expect(zkTicketPCD.claim.externalNullifier.value).to.equal("0");
    expect(zkTicketPCD.claim.signerPublicKey).to.equal(pubKey);
    expect(zkTicketPCD.claim.partialTicket.attendeeEmail).to.equal(
      ticketData.attendeeEmail
    );
    expect(zkTicketPCD.claim.partialTicket.attendeeName).to.equal(
      ticketData.attendeeName
    );
    expect(zkTicketPCD.claim.partialTicket.timestampConsumed).to.equal(
      ticketData.timestampConsumed
    );
    expect(zkTicketPCD.claim.partialTicket.timestampSigned).to.equal(
      ticketData.timestampSigned
    );
    expect(zkTicketPCD.claim.partialTicket.isConsumed).to.equal(
      ticketData.isConsumed
    );
    expect(zkTicketPCD.claim.partialTicket.isRevoked).to.equal(
      ticketData.isRevoked
    );
    expect(zkTicketPCD.claim.partialTicket.eventId).to.equal(
      ticketData.eventId
    );
    expect(zkTicketPCD.claim.partialTicket.productId).to.equal(
      ticketData.productId
    );
    expect(zkTicketPCD.claim.partialTicket.ticketId).to.equal(
      ticketData.ticketId
    );
    expect(zkTicketPCD.claim.partialTicket.ticketCategory).to.equal(
      ticketData.ticketCategory
    );
    expect(zkTicketPCD.claim.partialTicket.attendeeSemaphoreId).to.equal(
      ticketData.attendeeSemaphoreId
    );

    expect(await ZKPODTicketPCDPackage.verify(zkTicketPCD)).to.equal(true);
    expect(
      checkClaimAgainstProofRequest(
        zkTicketPCD.claim,
        makeProofRequest(proveArgs)
      )
    ).to.not.throw;
    expect(zkTicketPCD.claim.config.circuitIdentifier).to.equal(
      // This is the larger of the two circuit identifiers.
      "proto-pod-gpc_1o-11e-5md-0nv-1x200l-1x3t"
    );
  });

  it("should not make a proof for a ticket without a matching product ID", async function () {
    const serializedTicket = await PODTicketPCDPackage.serialize(ticketPCD);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const pubKey = ticketPCD.claim.signerPublicKey;
    const nonMatchingProductId = uuidv4();

    const proveArgs: ZKPODTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedTicket,
        validatorParams: {
          ticketPatterns: [
            {
              signerPublicKey: pubKey,
              events: [
                {
                  id: ticketData.eventId,
                  // Non-matching product ID
                  productIds: [nonMatchingProductId]
                }
              ]
            }
          ],
          notFoundMessage: "Not found"
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedIdentity
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: {}
      },
      revealSignerPublicKey: {
        argumentType: ArgumentTypeName.Boolean,
        value: true
      },
      watermark: { argumentType: ArgumentTypeName.String, value: "0" },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        value: "0"
      }
    };

    expect(ZKPODTicketPCDPackage.prove(proveArgs)).to.eventually.throw(
      `Error: Comparison value [{"type":"eddsa_pubkey","value":"${pubKey}"},{"type":"string","value":"${ticketData.eventId}"},{"type":"string","value":"${nonMatchingProductId}"}] corresponding to identifier "$tuple.idPatterns" is not a member of list "admissiblePatterns".`
    );
  });

  it("should not make a proof for a ticket without a matching event ID", async function () {
    const serializedTicket = await PODTicketPCDPackage.serialize(ticketPCD);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const pubKey = ticketPCD.claim.signerPublicKey;
    const nonMatchingEventId = uuidv4();

    const proveArgs: ZKPODTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedTicket,
        validatorParams: {
          ticketPatterns: [
            {
              signerPublicKey: pubKey,
              events: [
                {
                  // Non-matching event ID
                  id: nonMatchingEventId,
                  productIds: [ticketData.productId]
                }
              ]
            }
          ],
          notFoundMessage: "Not found"
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedIdentity
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: {}
      },
      revealSignerPublicKey: {
        argumentType: ArgumentTypeName.Boolean,
        value: true
      },
      watermark: { argumentType: ArgumentTypeName.String, value: "0" },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        value: "0"
      }
    };

    expect(ZKPODTicketPCDPackage.prove(proveArgs)).to.eventually.throw(
      `Error: Comparison value [{"type":"eddsa_pubkey","value":"${pubKey}"},{"type":"string","value":"${nonMatchingEventId}"},{"type":"string","value":"${ticketData.productId}"}] corresponding to identifier "$tuple.idPatterns" is not a member of list "admissiblePatterns".`
    );
  });

  it("should not make a proof for a ticket without a matching public key", async function () {
    const serializedTicket = await PODTicketPCDPackage.serialize(ticketPCD);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const nonMatchingPubKey = new RandExp(PUBLIC_KEY_REGEX).gen();

    const proveArgs: ZKPODTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedTicket,
        validatorParams: {
          ticketPatterns: [
            {
              // Non-matching public key
              signerPublicKey: nonMatchingPubKey,
              events: [
                {
                  id: ticketData.eventId,
                  productIds: [ticketData.productId]
                }
              ]
            }
          ],
          notFoundMessage: "Not found"
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedIdentity
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: {}
      },
      revealSignerPublicKey: {
        argumentType: ArgumentTypeName.Boolean,
        value: true
      },
      watermark: { argumentType: ArgumentTypeName.String, value: "0" },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        value: "0"
      }
    };

    expect(ZKPODTicketPCDPackage.prove(proveArgs)).to.eventually.throw(
      `Error: Comparison value [{"type":"eddsa_pubkey","value":"${nonMatchingPubKey}"},{"type":"string","value":"${ticketData.eventId}"},{"type":"string","value":"${ticketData.productId}"}] corresponding to identifier "$tuple.idPatterns" is not a member of list "admissiblePatterns".`
    );
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await ZKPODTicketPCDPackage.serialize(zkTicketPCD);
    const deserialized = await ZKPODTicketPCDPackage.deserialize(
      serialized.pcd
    );
    expect(deserialized.claim).to.deep.eq(zkTicketPCD.claim);
    expect(deserialized.proof).to.deep.eq(zkTicketPCD.proof);
    expect(deserialized.type).to.eq(zkTicketPCD.type);
    expect(deserialized.id).to.eq(zkTicketPCD.id);
  });
});
