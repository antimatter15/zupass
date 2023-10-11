import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import { EthereumOwnershipPCDPackage } from "@pcd/ethereum-ownership-pcd";
import { HaLoNoncePCDPackage } from "@pcd/halo-nonce-pcd";
import { PCDPackage } from "@pcd/pcd-types";
import { RLNPCDPackage } from "@pcd/rln-pcd";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { appConfig } from "./appConfig";
import { makeEncodedVerifyLink } from "./qr";

let pcdPackages: Promise<PCDPackage[]> | undefined;

export async function getPackages(): Promise<PCDPackage[]> {
  if (pcdPackages !== undefined) {
    return pcdPackages;
  }

  pcdPackages = loadPackages();
  return pcdPackages;
}

async function loadPackages(): Promise<PCDPackage[]> {
  const SERVER_STATIC_URL = appConfig.zupassServer + "/static/";

  await SemaphoreGroupPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey"
  });

  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey"
  });

  await EthereumOwnershipPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey"
  });

  await RLNPCDPackage.init({
    wasmFilePath: SERVER_STATIC_URL + "rln-artifacts/16.wasm",
    zkeyFilePath: SERVER_STATIC_URL + "rln-artifacts/16.zkey"
  });

  await RSATicketPCDPackage.init({
    makeEncodedVerifyLink
  });

  await EdDSATicketPCDPackage.init({
    makeEncodedVerifyLink
  });

  await ZKEdDSAEventTicketPCDPackage.init({
    wasmFilePath: "/artifacts/zk-eddsa-event-ticket-pcd/circuit.wasm",
    zkeyFilePath: "/artifacts/zk-eddsa-event-ticket-pcd/circuit.zkey"
  });

  return [
    SemaphoreGroupPCDPackage,
    SemaphoreIdentityPCDPackage,
    SemaphoreSignaturePCDPackage,
    EthereumOwnershipPCDPackage,
    RLNPCDPackage,
    HaLoNoncePCDPackage,
    RSAPCDPackage,
    RSATicketPCDPackage,
    EdDSAPCDPackage,
    EdDSATicketPCDPackage,
    ZKEdDSAEventTicketPCDPackage,
    RSAImagePCDPackage,
    EmailPCDPackage
  ];
}
