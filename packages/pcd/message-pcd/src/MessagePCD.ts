import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { DisplayOptions, PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { Message } from "./Message";
import { Args, MessagePCDTypeName } from "./args";
import { eddsaSign } from "./utils/eddsaSign";
import {
  MsgAsInt,
  bigintifyMsg,
  parseBigintifiedMsg
} from "./utils/serialization";

export interface MessageProof {
  /**
   * Signature of an {@link Message}, encoded by
   */
  signature: EdDSAPCD;

  /**
   * {@link MessagePCD} serializes {@link MessagePCD#claim} into a string, and
   * stuffs it into a single {@link BigInt}, so that it can be signed by
   * {@link EdDSAPCD}. Deserialization requires knowledge of the string's initial
   * length, an it's stored in this variable here.
   */
  stringLength: number;
}

export class MessagePCD implements PCD<Message, MessageProof> {
  type = MessagePCDTypeName;
  claim: Message;
  proof: MessageProof;
  id: string;

  public constructor(id: string, claim: Message, proof: MessageProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(args: Args): Promise<MessagePCD> {
  if (args.message.value === undefined) {
    throw new Error("missing message");
  }

  if (args.privateKey.value === undefined || args.privateKey.value === "") {
    throw new Error("missing private key");
  }

  return eddsaSign(args.message.value, args.privateKey.value, args.id.value);
}

export async function verify(msg: MessagePCD): Promise<boolean> {
  try {
    const msgInt = bigintifyMsg(msg.claim);
    const intInPCD = msg.proof.signature.claim.message[0];

    if (msgInt.len !== msg.proof.stringLength) {
      throw new Error("msg len mismatch");
    }

    if (
      msgInt.int !== intInPCD ||
      msg.proof.signature.claim.message.length !== 1
    ) {
      throw new Error("msg mismatch");
    }

    const valid = await EdDSAPCDPackage.verify(msg.proof.signature);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: MessagePCD
): Promise<SerializedPCD<MessagePCD>> {
  const proof = await EdDSAPCDPackage.serialize(pcd.proof.signature);
  return {
    type: MessagePCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: proof,
      bodyLength: pcd.proof.stringLength
    })
  } as SerializedPCD<MessagePCD>;
}

export async function deserialize(serialized: string): Promise<MessagePCD> {
  const wrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    wrapper.eddsaPCD.pcd
  );
  const arg = {
    int: deserializedEdDSAPCD.claim.message[0],
    len: wrapper.bodyLength
  } as MsgAsInt;

  const parsedMessage = parseBigintifiedMsg(arg);

  return new MessagePCD(wrapper.id, parsedMessage, {
    signature: deserializedEdDSAPCD,
    stringLength: wrapper.bodyLength
  });
}

export function getDisplayOptions(msg: MessagePCD): DisplayOptions {
  return {
    header: msg.claim?.displayName ?? "untitled",
    displayName: "msg-" + msg.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign markdown messages using an EdDSA keypair.
 */
export const MessagePCDPackage: PCDPackage<Message, MessageProof, Args> = {
  name: MessagePCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
