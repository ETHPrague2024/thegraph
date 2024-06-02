import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { LOANClaimed } from "../generated/schema"
import { LOANClaimed as LOANClaimedEvent } from "../generated/PWNSimpleLoan/PWNSimpleLoan"
import { handleLOANClaimed } from "../src/pwn-simple-loan"
import { createLOANClaimedEvent } from "./pwn-simple-loan-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let loanId = BigInt.fromI32(234)
    let defaulted = "boolean Not implemented"
    let newLOANClaimedEvent = createLOANClaimedEvent(loanId, defaulted)
    handleLOANClaimed(newLOANClaimedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("LOANClaimed created and stored", () => {
    assert.entityCount("LOANClaimed", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "LOANClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "loanId",
      "234"
    )
    assert.fieldEquals(
      "LOANClaimed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "defaulted",
      "boolean Not implemented"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
