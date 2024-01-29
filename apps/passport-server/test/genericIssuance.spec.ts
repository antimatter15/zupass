/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-globals */
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { ILemonadeAPI } from "../src/apis/lemonade/lemonadeAPI";
import { stopApplication } from "../src/application";
import { LemonadePipelineDefinition } from "../src/services/generic-issuance/pipelines/LemonadePipeline";
import { PretixPipelineDefinition } from "../src/services/generic-issuance/pipelines/PretixPipeline";
import { PipelineType } from "../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../src/types";
import { logger } from "../src/util/logger";
import { LemonadeDataMocker } from "./lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "./lemonade/MockLemonadeAPI";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

/**
 * Rough test of the generic issuance functionality defined in this PR, just
 * to make sure that ends are coming together neatly. Totally incomplete.
 *
 * TODO:
 * - finish this before shipping the {@link GenericIssuanceService}.
 * - comprehensive tests for both Pretix and Lemonade cases
 * - probably need to test the Capability route features of Pipelines
 * - probably need to test the iterative creation of Pipelines (cc @richard)
 */
describe.only("generic issuance declarations", function () {
  this.timeout(15_000);

  let application: Zupass;

  const mockLemonadeData = new LemonadeDataMocker();
  const edgeCity = mockLemonadeData.addEvent("edge city");
  const ivan = mockLemonadeData.addUser("ivan");
  const ga = mockLemonadeData.addTier(edgeCity.id, "ga");
  mockLemonadeData.addTicket(ga.id, edgeCity.id, ivan.name);
  mockLemonadeData.permissionUser(ivan.id, edgeCity.id);
  const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(mockLemonadeData);

  const exampleLemonadePipelineConfig: LemonadePipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      lemonadeApiKey: ivan.apiKey,
      events: [
        {
          id: edgeCity.id,
          name: edgeCity.name,
          ticketTierIds: [ga.id]
        }
      ]
    },
    type: PipelineType.Lemonade
  };

  const examplePretixPipelineConfig: PretixPipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      events: [
        {
          id: randomUUID(),
          name: "Eth LatAm",
          productIds: [randomUUID(), randomUUID()],
          superUserProductIds: [randomUUID()]
        }
      ],
      pretixAPIKey: randomUUID(),
      pretixOrgUrl: randomUUID()
    },
    type: PipelineType.Pretix
  };

  const definitions = [
    examplePretixPipelineConfig,
    exampleLemonadePipelineConfig
  ];

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);

    application = await startTestingApp({
      lemonadeAPI
    });
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  it("test", async () => {
    const giService = application.services.genericIssuanceService;
    expect(giService).to.not.be.undefined;
    logger("test");
  });
});
