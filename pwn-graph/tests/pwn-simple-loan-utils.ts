import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  LOANClaimed,
  LOANCreated,
  LOANExpirationDateExtended,
  LOANPaidBack,
  VaultPull,
  VaultPush,
  VaultPushFrom
} from "../generated/PWNSimpleLoan/PWNSimpleLoan"

export function createLOANClaimedEvent(
  loanId: BigInt,
  defaulted: boolean
): LOANClaimed {
  let loanClaimedEvent = changetype<LOANClaimed>(newMockEvent())

  loanClaimedEvent.parameters = new Array()

  loanClaimedEvent.parameters.push(
    new ethereum.EventParam("loanId", ethereum.Value.fromUnsignedBigInt(loanId))
  )
  loanClaimedEvent.parameters.push(
    new ethereum.EventParam("defaulted", ethereum.Value.fromBoolean(defaulted))
  )

  return loanClaimedEvent
}

export function createLOANCreatedEvent(
  loanId: BigInt,
  terms: ethereum.Tuple,
  factoryDataHash: Bytes,
  factoryAddress: Address
): LOANCreated {
  let loanCreatedEvent = changetype<LOANCreated>(newMockEvent())

  loanCreatedEvent.parameters = new Array()

  loanCreatedEvent.parameters.push(
    new ethereum.EventParam("loanId", ethereum.Value.fromUnsignedBigInt(loanId))
  )
  loanCreatedEvent.parameters.push(
    new ethereum.EventParam("terms", ethereum.Value.fromTuple(terms))
  )
  loanCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "factoryDataHash",
      ethereum.Value.fromFixedBytes(factoryDataHash)
    )
  )
  loanCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "factoryAddress",
      ethereum.Value.fromAddress(factoryAddress)
    )
  )

  return loanCreatedEvent
}

export function createLOANExpirationDateExtendedEvent(
  loanId: BigInt,
  extendedExpirationDate: BigInt
): LOANExpirationDateExtended {
  let loanExpirationDateExtendedEvent = changetype<LOANExpirationDateExtended>(
    newMockEvent()
  )

  loanExpirationDateExtendedEvent.parameters = new Array()

  loanExpirationDateExtendedEvent.parameters.push(
    new ethereum.EventParam("loanId", ethereum.Value.fromUnsignedBigInt(loanId))
  )
  loanExpirationDateExtendedEvent.parameters.push(
    new ethereum.EventParam(
      "extendedExpirationDate",
      ethereum.Value.fromUnsignedBigInt(extendedExpirationDate)
    )
  )

  return loanExpirationDateExtendedEvent
}

export function createLOANPaidBackEvent(loanId: BigInt): LOANPaidBack {
  let loanPaidBackEvent = changetype<LOANPaidBack>(newMockEvent())

  loanPaidBackEvent.parameters = new Array()

  loanPaidBackEvent.parameters.push(
    new ethereum.EventParam("loanId", ethereum.Value.fromUnsignedBigInt(loanId))
  )

  return loanPaidBackEvent
}

export function createVaultPullEvent(
  asset: ethereum.Tuple,
  origin: Address
): VaultPull {
  let vaultPullEvent = changetype<VaultPull>(newMockEvent())

  vaultPullEvent.parameters = new Array()

  vaultPullEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromTuple(asset))
  )
  vaultPullEvent.parameters.push(
    new ethereum.EventParam("origin", ethereum.Value.fromAddress(origin))
  )

  return vaultPullEvent
}

export function createVaultPushEvent(
  asset: ethereum.Tuple,
  beneficiary: Address
): VaultPush {
  let vaultPushEvent = changetype<VaultPush>(newMockEvent())

  vaultPushEvent.parameters = new Array()

  vaultPushEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromTuple(asset))
  )
  vaultPushEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )

  return vaultPushEvent
}

export function createVaultPushFromEvent(
  asset: ethereum.Tuple,
  origin: Address,
  beneficiary: Address
): VaultPushFrom {
  let vaultPushFromEvent = changetype<VaultPushFrom>(newMockEvent())

  vaultPushFromEvent.parameters = new Array()

  vaultPushFromEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromTuple(asset))
  )
  vaultPushFromEvent.parameters.push(
    new ethereum.EventParam("origin", ethereum.Value.fromAddress(origin))
  )
  vaultPushFromEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )

  return vaultPushFromEvent
}
