import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  PollFeedResult,
  requestPollFeed
} from "@pcd/passport-interface";
import { expectIsReplaceInFolderAction } from "@pcd/pcd-collection";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { stopApplication } from "../../../../src/application";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import { CSVPipeline } from "../../../../src/services/generic-issuance/pipelines/CSVPipeline/CSVPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { loadApolloErrorMessages } from "../../../lemonade/MockLemonadeServer";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import { expectLength, expectToExist, expectTrue } from "../../../util/util";
import { assertUserMatches } from "../../util";
import { makeTestCSVPipelineDefinition } from "./makeTestCSVPipelineDefinition";

describe("Generic Issuance", function () {
  const nowDate = new Date();
  const now = Date.now();

  // The Apollo client used by Lemonade does not load error messages by
  // default, so we have to call this.
  loadApolloErrorMessages();

  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  const csvPipeline: CSVPipelineDefinition =
    makeTestCSVPipelineDefinition(adminGIUserId);

  const pipelineDefinitions = [csvPipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with one pipelines:
   * - {@link CSVPipeline}, as defined by {@link csvPipeline}
   */
  this.beforeAll(async () => {
    // This has to be done here as it requires an `await`
    const zupassPublicKey = JSON.stringify(
      await getEdDSAPublicKey(testingEnv.SERVER_EDDSA_PRIVATE_KEY as string)
    );

    await overrideEnvironment({
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: zupassPublicKey,
      ...testingEnv
    });

    giBackend = await startTestingApp();

    const userDB = new PipelineUserDB(giBackend.context.dbPool);

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(adminUser);
    assertUserMatches(
      {
        id: adminGIUserId,
        email: adminGIUserEmail,
        isAdmin: true,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(adminUser.id)
    );

    giService = giBackend.services
      .genericIssuanceService as GenericIssuanceService;
    await giService.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB(
      giBackend.context.dbPool
    );
    await pipelineDefinitionDB.clearAllDefinitions();
    await pipelineDefinitionDB.setDefinitions(pipelineDefinitions);
    await giService.start(false);
  });

  this.beforeEach(async () => {
    MockDate.set(now);
  });

  this.afterEach(async () => {
    MockDate.reset();
  });

  step("PipelineUserDB", async function () {
    const userDB = new PipelineUserDB(giBackend.context.dbPool);

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(adminUser);
    assertUserMatches(
      {
        id: adminGIUserId,
        email: adminGIUserEmail,
        isAdmin: true,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(adminUser.id)
    );
  });

  step("CSVPipeline", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const csvPipeline = pipelines.find(CSVPipeline.is);
    expectToExist(csvPipeline);
    const loadRes = await csvPipeline.load();
    expectTrue(loadRes.success);
    const feedRes = await requestCSVFeed(
      csvPipeline.feedCapability.feedUrl,
      csvPipeline.feedCapability.options.feedId
    );
    expectTrue(feedRes.success);
    expectLength(feedRes.value.actions, 2);
    const pcdsAction = feedRes.value.actions[1];
    expectIsReplaceInFolderAction(pcdsAction);
    expectLength(pcdsAction.pcds, 2);
    expect(pcdsAction.folder).to.eq(
      csvPipeline.feedCapability.options.feedFolder
    );
  });

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const csvPipeline = pipelines.find(CSVPipeline.is);
    expectToExist(csvPipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
  });
});

async function requestCSVFeed(
  url: string,
  feedId: string
): Promise<PollFeedResult> {
  return requestPollFeed(url, { feedId, pcd: undefined });
}
